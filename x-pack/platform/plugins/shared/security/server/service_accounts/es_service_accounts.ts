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
import { parseCreateServiceAccountParams } from './create_params';
import type { ServiceAccountCredentialStore } from './credentials';
import { ensureManageSecurityPrivilege } from './manage_security_privilege';
import type { ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import {
  ES_SERVICE_ACCOUNT_FALLBACK_ROLE,
  ES_SERVICE_ACCOUNT_NAMESPACE,
  ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
  ES_SERVICE_ACCOUNT_TOKEN_NAME,
  SERVICE_ACCOUNT_MAX_ROLES,
  serviceAccountRoleNameSchema,
} from '../../common/service_accounts';
import { getDetailedErrorMessage } from '../errors';

/**
 * The discriminator on an account Elasticsearch reports, which decides whether the account is one
 * Kibana manages at all.
 */
const userManagedEntrySchema = z.object({ type: z.literal('user_managed') });

/**
 * The rest of what Elasticsearch reports for an account keyed by its `{namespace}/{service}`
 * principal. Parsed separately from the discriminator above, so "this is not Kibana's account"
 * and "Kibana cannot read this account" stay different answers.
 */
const accountEntrySchema = z.object({
  roles: z.array(serviceAccountRoleNameSchema).max(SERVICE_ACCOUNT_MAX_ROLES),
  enabled: z.boolean(),
});

const createTokenResponseSchema = z.object({
  token: z.object({
    // codeql[js/kibana/unbounded-string-in-schema] upstream response — not caller-controlled input
    value: z.string().min(1).max(ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH),
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
    // The schema refuses an empty `roles` rather than letting it fall through to the derivation
    // below, which would answer an explicit "no roles" with the widest possible grant.
    const { name, roles: requestedRoles } = parseCreateServiceAccountParams(params);
    const serviceAccountId = `${namespace}/${name}`;

    const derivedRoles = requestedRoles ?? user.roles ?? [];
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
    return { id: serviceAccountId, name };
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
   * Reads the account back, resolving `undefined` when it does not exist, or when the principal
   * resolves to a built-in account: those are not Kibana's to manage, and must never be mistaken
   * for one it created.
   *
   * Throws when a user-managed account is there but Kibana cannot read it. The caller refuses a
   * taken name on the strength of this, and the Elasticsearch PUT behind it is a full
   * replacement, so "I cannot parse this" must never read as "the name is free".
   */
  private async readAccount(
    esClient: ElasticsearchClient,
    namespace: string,
    name: string
  ): Promise<ElasticsearchServiceAccount | undefined> {
    const principal = `${namespace}/${name}`;

    const response = await esClient.transport.request<Record<string, unknown>>(
      {
        method: 'GET',
        path: accountPath(namespace, name),
        // Asked for explicitly, because the API's default depends on the shape of the path.
        // Kibana only ever manages user-managed accounts.
        querystring: { type: 'user_managed' },
      },
      // An unknown principal is an empty 200 rather than a 404. Ignore 404 as well, so a future
      // tightening upstream does not turn "no such account" into an error.
      { ignore: [404] }
    );

    const entry = response?.[principal];
    if (entry === undefined) {
      return undefined;
    }

    // The type filter above should keep built-in accounts out of the response. This is what holds
    // if it does not, and what makes a future third account type read as "not Kibana's" rather
    // than as unreadable.
    if (!userManagedEntrySchema.safeParse(entry).success) {
      this.logger.debug(`Service account [${principal}] is not a user-managed account`);
      return undefined;
    }

    const parsed = accountEntrySchema.safeParse(entry);
    if (!parsed.success) {
      // Refused rather than reported absent: this name belongs to an account Kibana manages, and
      // the caller would otherwise overwrite it.
      this.logger.error(
        `Elasticsearch reported service account [${principal}] in an unrecognized shape: ${parsed.error.message}`
      );
      throw Boom.badGateway(
        `Cannot determine the state of service account [${name}]: Elasticsearch reported it in an unrecognized shape.`
      );
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
   *
   * The two deletes are attempted independently. A token Elasticsearch would not give up is the
   * case the forced account delete exists for, so it must not also be what stops it from running.
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
    } catch (e) {
      this.logger.error(
        `Failed to delete the token of partially created service account [${principal}]: ` +
          getDetailedErrorMessage(e)
      );
    }

    try {
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
        `Failed to roll back partially created service account [${principal}]. It may need to be ` +
          `removed manually: ${getDetailedErrorMessage(e)}`
      );
    }
  }
}

const accountPath = (namespace: string, name: string) =>
  `/_security/service/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
