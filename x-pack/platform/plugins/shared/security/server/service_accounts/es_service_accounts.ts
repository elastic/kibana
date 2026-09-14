/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type {
  AuthenticatedUser,
  ElasticsearchClient,
  IClusterClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { resolveWorkloadBinder } from './bindings';
import type { ServiceAccountCredentialStore } from './credentials';
import { ensureManageSecurityPrivilege } from './manage_security_privilege';
import type { ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import {
  ES_SERVICE_ACCOUNT_FALLBACK_ROLE,
  ES_SERVICE_ACCOUNT_NAMESPACE,
  ES_SERVICE_ACCOUNT_TOKEN_NAME,
  SERVICE_ACCOUNT_MAX_ROLES,
  SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
  serviceAccountNameSchema,
  serviceAccountRoleNameSchema,
} from '../../common/service_accounts';
import { getDetailedErrorMessage } from '../errors';

/**
 * Elasticsearch reports an account keyed by its `{namespace}/{service}` principal. Validated so
 * that a shape change fails here rather than leaking a partially-undefined account to callers.
 */
const accountEntrySchema = z.object({
  type: z.literal('user_managed'),
  roles: z.array(serviceAccountRoleNameSchema).max(SERVICE_ACCOUNT_MAX_ROLES),
  enabled: z.boolean(),
});

const createTokenResponseSchema = z.object({
  token: z.object({
    // codeql[js/kibana/unbounded-string-in-schema] upstream response — not caller-controlled input
    value: z.string().min(1).max(SERVICE_ACCOUNT_TOKEN_MAX_LENGTH),
  }),
});

/** An Elasticsearch user-managed service account, as Elasticsearch reports it. */
interface ElasticsearchServiceAccount {
  id: string;
  name: string;
  namespace: string;
  roles: string[];
  enabled: boolean;
}

export interface EsServiceAccountsOptions {
  logger: Logger;
  license: SecurityLicense;
  clusterClient: IClusterClient;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  credentialStore: ServiceAccountCredentialStore;
  /** Whether saved object encryption is possible; without it the token cannot be stored. */
  canEncrypt: boolean;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
  getCurrentUserProfileId: (request: KibanaRequest) => Promise<string | null>;
}

/**
 * Elasticsearch-backed service accounts, used when UIAM is not available.
 *
 * Creating an account also mints the one long-lived service account token Kibana manages for it
 * and stores that token encrypted. The token never leaves the security plugin: consumers are
 * handed a short-lived token exchanged from it.
 */
export class EsServiceAccounts implements ServiceAccountsBackend {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly clusterClient: IClusterClient;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly credentialStore: ServiceAccountCredentialStore;
  private readonly canEncrypt: boolean;
  private readonly getCurrentUser: EsServiceAccountsOptions['getCurrentUser'];
  private readonly getCurrentUserProfileId: EsServiceAccountsOptions['getCurrentUserProfileId'];

  constructor({
    logger,
    license,
    clusterClient,
    checkPrivilegesWithRequest,
    credentialStore,
    canEncrypt,
    getCurrentUser,
    getCurrentUserProfileId,
  }: EsServiceAccountsOptions) {
    this.logger = logger;
    this.license = license;
    this.clusterClient = clusterClient;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.credentialStore = credentialStore;
    this.canEncrypt = canEncrypt;
    this.getCurrentUser = getCurrentUser;
    this.getCurrentUserProfileId = getCurrentUserProfileId;
  }

  async create(
    request: KibanaRequest,
    params: CreateServiceAccountParams
  ): Promise<ServiceAccount> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot create a service account: security features are disabled in Elasticsearch'
      );
    }

    if (!this.canEncrypt) {
      throw Boom.failedDependency(
        'Cannot create a service account: `xpack.encryptedSavedObjects.encryptionKey` is not ' +
          'configured, so the account credential cannot be stored securely'
      );
    }

    await ensureManageSecurityPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      action: 'create a service account',
    });

    const user = this.getCurrentUser(request);
    if (!user) {
      throw Boom.unauthorized('Cannot create a service account: the request is not authenticated');
    }

    const namespace = ES_SERVICE_ACCOUNT_NAMESPACE;
    // Re-validated here rather than trusted from the route, because the name is interpolated
    // into an Elasticsearch path and callers of the server contract never pass through the route.
    const parsedName = serviceAccountNameSchema.safeParse(params.name);
    if (!parsedName.success) {
      throw Boom.badRequest(`Cannot create a service account: invalid name [${params.name}]`);
    }
    const name = parsedName.data;
    const serviceAccountId = `${namespace}/${name}`;

    const derivedRoles = params.roles ?? user.roles ?? [];
    const roles = derivedRoles.length > 0 ? derivedRoles : [ES_SERVICE_ACCOUNT_FALLBACK_ROLE];

    if (derivedRoles.length === 0) {
      this.logger.warn(
        `No roles could be derived for service account [${serviceAccountId}] from the current ` +
          `credentials, so it was granted [${ES_SERVICE_ACCOUNT_FALLBACK_ROLE}]. Specify \`roles\` ` +
          `explicitly to scope it down.`
      );
    }

    const esClient = this.clusterClient.asScoped(request).asCurrentUser;

    // Elasticsearch's PUT is a full replacement: writing over an existing account would silently
    // reset its roles and re-enable it. Creating is therefore refused outright for a name that is
    // taken. The check and the write are not atomic; concurrent creates of one name are a narrow,
    // accepted race.
    if (await this.readAccount(esClient, namespace, name)) {
      throw Boom.conflict(`A service account named [${name}] already exists`);
    }

    this.logger.debug(`Attempting to create service account [${serviceAccountId}]`);

    try {
      await esClient.transport.request({
        method: 'PUT',
        path: accountPath(namespace, name),
        body: { roles },
        querystring: { refresh: 'wait_for' },
      });
    } catch (e) {
      this.logger.error(`Failed to create service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }

    try {
      const token = await this.createToken(esClient, namespace, name);

      await this.credentialStore.set({
        serviceAccountId,
        namespace,
        name,
        tokenName: ES_SERVICE_ACCOUNT_TOKEN_NAME,
        createdAt: new Date().toISOString(),
        createdBy: await resolveWorkloadBinder(
          user,
          async () => (await this.getCurrentUserProfileId(request)) ?? undefined
        ),
        token,
      });
    } catch (e) {
      // The account and any token it already has are Kibana's to clean up: leaving behind a
      // credential Kibana cannot reach would be worse than the failure that got us here.
      await this.rollback(esClient, namespace, name);
      this.logger.error(`Failed to create service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }

    const created = await this.readAccount(esClient, namespace, name);
    if (!created) {
      throw Boom.internal(`Service account [${serviceAccountId}] was not found after creation`);
    }

    return { id: created.id, name: created.name };
  }

  // See https://github.com/elastic/kibana/issues/284465.
  async createFakeRequest(): Promise<KibanaRequest> {
    throw Boom.notImplemented(
      'Creating requests for Elasticsearch service accounts is not yet implemented'
    );
  }

  // This backend does not mint service-account-bound requests yet, so there is nothing to
  // refresh; `null` (rather than an error) keeps the ES-client unauthorized-error handler on its
  // not-handled path for unrelated fake requests.
  async reauthenticateFakeRequest(): Promise<{ authorization: string } | null> {
    return null;
  }

  // Nothing is ever registered by this backend, so there is nothing to release.
  releaseFakeRequest(): void {}

  /**
   * Reads the account back, resolving `undefined` when it does not exist. A principal that
   * resolves to a built-in account is reported as absent: those are not Kibana's to manage, and
   * must never be mistaken for one it created.
   */
  private async readAccount(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<ElasticsearchServiceAccount | undefined> {
    const principal = `${namespace}/${name}`;

    const response = await esClient.transport.request<Record<string, unknown>>(
      { method: 'GET', path: accountPath(namespace, name) },
      // A scoped GET returns both built-in and user-managed accounts, and an unknown principal
      // is an empty 200 rather than a 404 — but ignore 404 too, so a future tightening upstream
      // does not turn "no such account" into an error.
      { ignore: [404] }
    );

    const entry = response?.[principal];
    if (entry === undefined) {
      return undefined;
    }

    const parsed = accountEntrySchema.safeParse(entry);
    if (!parsed.success) {
      this.logger.debug(
        `Service account [${principal}] is not a user-managed account: ${parsed.error.message}`
      );
      return undefined;
    }

    return {
      id: principal,
      name,
      namespace,
      roles: parsed.data.roles,
      enabled: parsed.data.enabled,
    };
  }

  private async createToken(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<string> {
    const response = await esClient.transport.request({
      method: 'POST',
      path: `${accountPath(namespace, name)}/credential/token/${encodeURIComponent(
        ES_SERVICE_ACCOUNT_TOKEN_NAME
      )}`,
    });

    return createTokenResponseSchema.parse(response).token.value;
  }

  /**
   * Best effort: the error that triggered the rollback is the one the caller needs, so a failure
   * here is logged rather than thrown. An account left behind blocks re-creating that name until
   * an operator removes it, which is why the principal is named in the log.
   */
  private async rollback(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<void> {
    const principal = `${namespace}/${name}`;
    try {
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: `${accountPath(namespace, name)}/credential/token/${encodeURIComponent(
            ES_SERVICE_ACCOUNT_TOKEN_NAME
          )}`,
        },
        { ignore: [404] }
      );
      // `force`, so the account still goes away if the token delete above did not land:
      // Elasticsearch refuses an unforced delete while any token remains.
      await esClient.transport.request(
        {
          method: 'DELETE',
          path: accountPath(namespace, name),
          querystring: { force: 'true' },
        },
        { ignore: [404] }
      );
    } catch (e) {
      this.logger.error(
        `Failed to roll back partially created service account [${principal}]; it may need to be ` +
          `removed manually: ${getDetailedErrorMessage(e)}`
      );
    }
  }
}

const accountPath = (namespace: string, name: string) =>
  `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
