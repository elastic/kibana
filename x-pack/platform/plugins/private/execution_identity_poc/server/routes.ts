/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, StartServicesAccessor } from '@kbn/core/server';
import {
  SA_TOKEN_SO_TYPE,
  soIdForServiceAccount,
  type ServiceAccountTokenAttributes,
} from './saved_object';
import type { ExecutionIdentityPocStartDeps } from './types';

const AUTHZ_OFF = {
  authz: {
    enabled: false as const,
    reason: 'POC dev-only route; the real SA authorization model is out of scope here.',
  },
};

const INTERNAL = { access: 'internal' as const };

interface EsError {
  message?: string;
  statusCode?: number;
}

interface ProbeResult {
  allowed: boolean;
  status?: number;
  detail?: string;
}

// Run one ES action as the SA and report whether it was authorized (fail-closed on error).
const probe = async (fn: () => Promise<unknown>): Promise<ProbeResult> => {
  try {
    await fn();
    return { allowed: true };
  } catch (e) {
    const err = e as EsError;
    return { allowed: false, status: err.statusCode, detail: err.message };
  }
};

export function registerRoutes(
  router: IRouter,
  logger: Logger,
  getStartServices: StartServicesAccessor<ExecutionIdentityPocStartDeps>
): void {
  // --- Increment 1: liveness ---------------------------------------------
  router.get(
    {
      path: '/internal/execution_identity_poc/ping',
      validate: false,
      security: AUTHZ_OFF,
      options: INTERNAL,
    },
    async (_context, _request, response) => {
      logger.debug('[execution_identity_poc] ping');
      return response.ok({ body: { ok: true, plugin: 'executionIdentityPoc' } });
    }
  );

  // --- Increment 2a: create the SA AS THE CURRENT ADMIN, mint + store token ---
  // Runs as the request's user (asCurrentUser) — creation-time authz is ES's job
  // (manage_security). The minted bearer token is persisted encrypted-at-rest (D29),
  // never returned to the caller.
  router.post(
    {
      path: '/internal/execution_identity_poc/service_accounts',
      validate: {
        body: schema.object({
          namespace: schema.string({ minLength: 1, maxLength: 128 }),
          service: schema.string({ minLength: 1, maxLength: 128 }),
          roles: schema.arrayOf(schema.string({ maxLength: 1024 }), {
            defaultValue: [],
            maxSize: 64,
          }),
        }),
      },
      security: AUTHZ_OFF,
      options: INTERNAL,
    },
    async (context, request, response) => {
      const { namespace, service, roles } = request.body;
      const id = `${namespace}/${service}`;
      const asCurrentUser = (await context.core).elasticsearch.client.asCurrentUser;
      try {
        // Branch-new managed-account endpoint — no typed client method yet.
        const created = await asCurrentUser.transport.request({
          method: 'PUT',
          path: `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(
            service
          )}`,
          body: { roles, enabled: true },
        });
        // Unique token name per call: ES returns a token value only at mint time,
        // so a fresh name avoids colliding with any pre-existing token.
        const tokenName = `kibana-${Date.now()}`;
        const tokenRes = (await asCurrentUser.transport.request({
          method: 'POST',
          path: `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(
            service
          )}/credential/token/${encodeURIComponent(tokenName)}`,
        })) as { token: { name: string; value: string } };

        // Custody: persist the bearer token as an encrypted saved object (D29).
        // getUnsafeInternalClient wires the encryption extension (createInternalRepository
        // does not) while dropping user scoping — so `token` is encrypted at rest on write.
        const [coreStart] = await getStartServices();
        await coreStart.savedObjects
          .getUnsafeInternalClient({ includedHiddenTypes: [SA_TOKEN_SO_TYPE] })
          .create<ServiceAccountTokenAttributes>(
            SA_TOKEN_SO_TYPE,
            { saId: id, token: tokenRes.token.value },
            { id: soIdForServiceAccount(id), overwrite: true }
          );

        logger.info(`[execution_identity_poc] created + stored token for service account [${id}]`);
        return response.ok({ body: { id, created, tokenName: tokenRes.token.name } });
      } catch (e) {
        const err = e as EsError;
        logger.error(`[execution_identity_poc] create failed for [${id}]: ${err.message}`);
        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: { message: err.message ?? 'create failed' },
        });
      }
    }
  );

  // --- Increment 2b/3: resolve + run AS THE SA, prove downscoping -------------
  // Decrypt the stored token, grant a short-lived key on behalf as kibana_system,
  // then run as the SA and confirm it may READ but not WRITE.
  router.post(
    {
      path: '/internal/execution_identity_poc/run_as',
      validate: {
        body: schema.object({
          id: schema.string({ minLength: 1, maxLength: 260 }),
          index: schema.string({ minLength: 1, maxLength: 255, defaultValue: 'poc-billing-data' }),
        }),
      },
      security: AUTHZ_OFF,
      options: INTERNAL,
    },
    async (context, request, response) => {
      const { id, index } = request.body;
      const [coreStart, { encryptedSavedObjects }] = await getStartServices();

      // Retrieve custody: decrypt the stored bearer token. Missing → fail closed.
      let token: string;
      try {
        const { attributes } = await encryptedSavedObjects
          .getClient({ includedHiddenTypes: [SA_TOKEN_SO_TYPE] })
          .getDecryptedAsInternalUser<ServiceAccountTokenAttributes>(
            SA_TOKEN_SO_TYPE,
            soIdForServiceAccount(id)
          );
        token = attributes.token;
      } catch (e) {
        const err = e as EsError;
        logger.warn(
          `[execution_identity_poc] no decryptable credential for [${id}]: ${err.message}`
        );
        return response.notFound({
          body: { message: `No stored credential for service account [${id}]` },
        });
      }

      const scopedClient = (await context.core).elasticsearch.client;
      try {
        const grant = await scopedClient.asInternalUser.security.grantApiKey({
          grant_type: 'access_token',
          access_token: token,
          api_key: { name: `wf-run-${id}`, expiration: '5m' },
        });
        const asServiceAccount = coreStart.elasticsearch.client.asScoped({
          headers: { authorization: `ApiKey ${grant.encoded}` },
        }).asCurrentUser;
        const who = await asServiceAccount.security.authenticate();

        // Prove downscoping: as viewer, the SA may READ but must NOT WRITE.
        let read: ProbeResult & { hits?: number };
        try {
          const res = await asServiceAccount.search({
            index,
            size: 0,
            track_total_hits: true,
          });
          const total = res.hits.total;
          read = { allowed: true, hits: typeof total === 'number' ? total : total?.value };
        } catch (e) {
          const err = e as EsError;
          read = { allowed: false, status: err.statusCode, detail: err.message };
        }
        const write = await probe(() =>
          asServiceAccount.index({ index, document: { note: 'poc write attempt' } })
        );

        logger.info(`[execution_identity_poc] ran as [${id}] via granted key [${grant.id}]`);
        return response.ok({
          body: {
            grantedApiKeyId: grant.id,
            authenticatedAs: {
              username: who.username,
              roles: who.roles,
              authentication_type: who.authentication_type,
            },
            index,
            read,
            write,
          },
        });
      } catch (e) {
        const err = e as EsError;
        logger.error(`[execution_identity_poc] run_as failed for [${id}]: ${err.message}`);
        return response.customError({
          statusCode: err.statusCode ?? 500,
          body: { message: err.message ?? 'run_as failed' },
        });
      }
    }
  );
}
