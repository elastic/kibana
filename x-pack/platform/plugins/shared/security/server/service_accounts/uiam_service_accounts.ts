/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { CreateServiceAccountParams, ServiceAccount } from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { buildAssumableBy } from './assumable_by';
import { ensureClusterPrivilege } from './cluster_privilege';
import { parseCreateServiceAccountParams } from './create_params';
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';
import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS, ServiceAccountFakeRequests } from './fake_requests';
import { SERVICE_ACCOUNT_ROLE_ASSIGNMENTS } from './role_assignments';
import { ServiceAccountTokenExchangeError } from './token_exchange_error';
import type {
  CloudProjectContext,
  ListServiceAccountsParams,
  ServiceAccountsBackend,
} from './types';
import type { SecurityLicense } from '../../common';
import type {
  ListServiceAccountsResponse,
  ServiceAccountDirectoryCreator,
  ServiceAccountDirectoryEntry,
} from '../../common/service_accounts';
import {
  SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE,
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
  serviceAccountIdSchema,
  serviceAccountNameSchema,
} from '../../common/service_accounts';
import { getDetailedErrorMessage } from '../errors';
import { securityTelemetry } from '../otel/instrumentation';
import {
  getUiamAuthorizationHeaderFromRequest,
  isExternalApiKey,
  type UiamServiceAccount,
  type UiamServiceAccountCreator,
  type UiamServicePublic,
} from '../uiam';

/**
 * The fields of UIAM's response that cross the contract boundary. The rest of the payload is
 * deliberately unvalidated: Kibana neither consumes nor reports it, so a shape change there is
 * not Kibana's to detect.
 */
const serviceAccountSchema = z.object({
  id: serviceAccountIdSchema,
  name: serviceAccountNameSchema,
});

const serviceAccountCreatorSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('user'),
    id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
    first_name: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
    last_name: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
  }),
  z.object({
    type: z.literal('api-key'),
    id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
    description: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
  }),
]);

/** What get and list report on top of the create payload. */
const serviceAccountDetailsSchema = serviceAccountSchema.extend({
  creator: serviceAccountCreatorSchema,
});

/**
 * The envelope only. Its entries are deliberately `unknown` here and parsed one at a time in
 * {@link UiamServiceAccounts.list}, so that one account UIAM reports oddly cannot make the whole
 * directory unreadable.
 */
const listServiceAccountsResponseSchema = z.object({
  service_accounts: z.array(z.unknown()).max(SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE),
  next_page: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
});

/**
 * UIAM identifies a user by the numeric id that is also their Kibana username on serverless, so
 * the id maps straight onto the binder's `username`. That id is all the binder can say, which is
 * why the creator's own name comes along as `displayName`: nothing downstream could resolve it
 * from the id.
 */
const toCreatedBy = (creator: UiamServiceAccountCreator): ServiceAccountDirectoryCreator => {
  if (creator.type === 'user') {
    const displayName = [creator.first_name, creator.last_name].filter(Boolean).join(' ');
    return { type: 'user', username: creator.id, ...(displayName ? { displayName } : {}) };
  }

  return {
    type: 'api_key',
    apiKeyId: creator.id,
    variant: 'uiam',
    ...(creator.description ? { displayName: creator.description } : {}),
  };
};

/**
 * Narrows a UIAM account to the directory entry. UIAM has no disabled state and reports no role
 * names yet, and Kibana exchanges for a token rather than holding one, so those three answers
 * are constants here.
 */
const toDirectoryEntry = ({
  id,
  name,
  creator,
}: z.infer<typeof serviceAccountDetailsSchema>): ServiceAccountDirectoryEntry => ({
  id,
  name,
  roles: [],
  enabled: true,
  hasCredential: true,
  createdBy: toCreatedBy(creator),
});

/**
 * Validates the token exchange payload UIAM returns, so that a shape change fails loudly here
 * rather than leaking partially-undefined objects to consumers. Verified against image
 * `docker.elastic.co/cloud-ci/uiam:git-a67a2f75a615`, whose exchange response carries `token`
 * plus an `expires_in` ISO-8601 duration (currently `PT5M`) that is intentionally stripped:
 * token freshness is managed locally and nothing should key off the upstream TTL.
 */
const exchangeTokenResponseSchema = z.object({
  // codeql[js/kibana/unbounded-string-in-schema] upstream response — not caller-controlled input
  token: z.string().min(1).max(SERVICE_ACCOUNT_TOKEN_MAX_LENGTH),
});

const exchangeErrorResponseSchema = z.object({
  error: z.object({ code: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH) }),
});

export interface UiamServiceAccountsOptions {
  logger: Logger;
  requestLifetimeMs: number;
  license: SecurityLicense;
  uiam: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  cloudProjectContext: CloudProjectContext;
  getCurrentUser: (request: KibanaRequest) => AuthenticatedUser | null;
}

export class UiamServiceAccounts implements ServiceAccountsBackend {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly cloudProjectContext: CloudProjectContext;
  private readonly getCurrentUser: UiamServiceAccountsOptions['getCurrentUser'];
  private readonly fakeRequests: ServiceAccountFakeRequests;

  constructor({
    logger,
    requestLifetimeMs,
    license,
    uiam,
    checkPrivilegesWithRequest,
    cloudProjectContext,
    getCurrentUser,
  }: UiamServiceAccountsOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.cloudProjectContext = cloudProjectContext;
    this.getCurrentUser = getCurrentUser;
    this.fakeRequests = new ServiceAccountFakeRequests(
      logger,
      async (serviceAccountId) => {
        const { token } = await this.exchangeToken(serviceAccountId);
        return token;
      },
      requestLifetimeMs
    );
  }

  async create(
    request: KibanaRequest,
    params: CreateServiceAccountParams
  ): Promise<ServiceAccount> {
    try {
      const account = await this.createAccount(request, params);
      securityTelemetry.recordServiceAccountCreationAttempt({
        outcome: 'success',
        serviceAccountBackend: 'uiam',
      });
      return account;
    } catch (e) {
      securityTelemetry.recordServiceAccountCreationAttempt({
        outcome: 'failure',
        serviceAccountBackend: 'uiam',
      });
      throw e;
    }
  }

  private async createAccount(
    request: KibanaRequest,
    params: CreateServiceAccountParams
  ): Promise<ServiceAccount> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot create a service account: security features are disabled in Elasticsearch'
      );
    }

    const { name, roles } = parseCreateServiceAccountParams(params);

    // UIAM's first iteration grants the account its creator's privileges and offers no way to
    // narrow them, so a caller-supplied role list cannot be honoured. Rejected rather than
    // ignored, so the asymmetry with the Elasticsearch backend is discoverable.
    if (roles) {
      throw Boom.badRequest(
        'Cannot create a service account: `roles` is not supported on this deployment; the ' +
          "service account is granted the creator's privileges"
      );
    }

    const authorization = getUiamAuthorizationHeaderFromRequest(request);

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'manage_security',
      action: 'create a service account',
    });

    this.logger.debug('Attempting to create a service account');

    let result: UiamServiceAccount;
    try {
      result = await this.uiam.createServiceAccount(
        authorization,
        {
          organization_id: this.cloudProjectContext.organizationId,
          name,
          role_assignments: SERVICE_ACCOUNT_ROLE_ASSIGNMENTS,
          assumable_by: buildAssumableBy(this.cloudProjectContext),
        },
        // External API keys must not carry client authentication (`null`); everything else is
        // vouched for with Kibana's own shared secret.
        isExternalApiKey(this.getCurrentUser(request)) ? null : undefined
      );
    } catch (e) {
      this.logger.error(
        `Failed to create service account [${name}]: ${getDetailedErrorMessage(e)}`
      );
      throw e;
    }

    // Validated outside the block above, so a refusal to report the account is not logged a
    // second time as a failure to create it. By this point the account does exist.
    const parsed = serviceAccountSchema.safeParse(result);
    if (!parsed.success) {
      // Returning an id or a name Kibana just rejected would be worse than failing, so name the
      // account in the log: nothing else can find it now.
      this.logger.error(
        `UIAM reported the created service account [${name}] in an unrecognized shape. It may ` +
          `need to be removed manually: ${parsed.error.message}`
      );
      throw Boom.badGateway('The service account was created but could not be reported back.');
    }

    return parsed.data;
  }

  async list(
    request: KibanaRequest,
    { limit = SERVICE_ACCOUNT_LIST_MAX_PAGE_SIZE, after }: ListServiceAccountsParams = {}
  ): Promise<ListServiceAccountsResponse> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot list service accounts: security features are disabled in Elasticsearch'
      );
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'read_security',
      action: 'list service accounts',
    });

    this.logger.debug('Attempting to list service accounts');

    try {
      const result = await this.uiam.listServiceAccounts({
        limit,
        // Forwarded unchecked: the cursor's shape is UIAM's, not Kibana's. UIAM validates it as
        // an id of 1 to 100 characters and answers a bad one with its own 400, which
        // `#parseUiamResponse` turns into the Boom this method propagates.
        ...(after !== undefined ? { after } : {}),
      });
      const parsed = listServiceAccountsResponseSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account list payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw Boom.badGateway('Error occurred during service account listing.');
      }

      const { service_accounts: rawAccounts, next_page: nextPage } = parsed.data;

      // Each account is parsed on its own, and one Kibana cannot read is skipped rather than
      // taken as a reason to refuse the page. Same call `readAccount` makes on the Elasticsearch
      // backend, which answers `undefined` for an account type it does not know: an oddity in one
      // account must not make the whole directory unreadable.
      const serviceAccounts = rawAccounts.flatMap((account) => {
        const details = serviceAccountDetailsSchema.safeParse(account);
        if (!details.success) {
          this.logger.warn(
            `Skipping a service account UIAM reported in an unrecognized shape: ${details.error.message}`
          );
          return [];
        }

        return [toDirectoryEntry(details.data)];
      });

      return {
        serviceAccounts,
        ...(nextPage !== undefined ? { nextPage } : {}),
      };
    } catch (e) {
      this.logger.error(`Failed to list service accounts: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async get(request: KibanaRequest, id: string): Promise<ServiceAccountDirectoryEntry> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot get a service account: security features are disabled in Elasticsearch'
      );
    }

    await ensureClusterPrivilege({
      request,
      checkPrivilegesWithRequest: this.checkPrivilegesWithRequest,
      logger: this.logger,
      privilege: 'read_security',
      action: 'get a service account',
    });

    this.logger.debug(`Attempting to get service account ${id}`);

    try {
      const result = await this.uiam.getServiceAccount(id);
      const parsed = serviceAccountDetailsSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw Boom.badGateway('Error occurred during service account retrieval.');
      }

      return toDirectoryEntry(parsed.data);
    } catch (e) {
      this.logger.error(`Failed to get service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  /**
   * Exchanges the service account ID for an ephemeral access token under Kibana's own system
   * credential. Deliberately private: the raw credential never leaves this backend — consumers
   * get a fake request bound to it instead.
   */
  private async exchangeToken(serviceAccountId: string): Promise<{ token: string }> {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(
        'Cannot exchange a service account token: security features are disabled in Elasticsearch'
      );
    }

    this.logger.debug(
      `Attempting to exchange service account ${serviceAccountId} for an ephemeral token`
    );
    let result: { token: string };
    try {
      result = await this.uiam.exchangeServiceAccountToken(serviceAccountId);
    } catch (e) {
      const cause =
        e instanceof Error ? e : new Error('Unknown token exchange failure.', { cause: e });
      const retryDelay = getExchangeRetryDelay(cause);
      // Upstream messages can contain credentials; retain the cause without logging its contents.
      this.logger.error(
        `Failed to exchange service account ${serviceAccountId} for an ephemeral token (${
          retryDelay === null ? 'terminal' : 'retryable'
        } failure)`
      );
      throw new ServiceAccountTokenExchangeError(cause, retryDelay !== null, retryDelay ?? 0);
    }

    const parsed = exchangeTokenResponseSchema.safeParse(result);
    if (!parsed.success) {
      this.logger.error(
        `Token exchange payload from UIAM failed validation for service account ${serviceAccountId}`
      );
      throw new ServiceAccountTokenExchangeError(parsed.error, false);
    }

    return parsed.data;
  }

  async createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest> {
    // The license gate is enforced by `exchangeToken`, which mints the initial credential.
    return await this.fakeRequests.create(params);
  }

  releaseFakeRequest(request: KibanaRequest): void {
    this.fakeRequests.release(request);
  }

  async reauthenticateFakeRequest(
    request: KibanaRequest
  ): Promise<{ authorization: string } | null> {
    if (!this.fakeRequests.isServiceAccountRequest(request)) {
      return null;
    }

    try {
      const token = await this.fakeRequests.ensureFreshToken(
        request,
        SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS
      );
      return { authorization: `Bearer ${token}` };
    } catch {
      return null;
    }
  }
}

const TERMINAL_EXCHANGE_CODES = new Set([
  '0xEDF789', // ORGANIZATION_SERVICE_ACCOUNT_NOT_FOUND
  '0x3B8626', // ORGANIZATION_SERVICE_ACCOUNT_REVOKED
  '0x93B121', // AUTHZ_DENY
]);
const RETRYABLE_EXCHANGE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_TRANSPORT_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'EPIPE',
  'EAI_AGAIN',
  'ETIMEDOUT',
  'ENETUNREACH',
  'EHOSTUNREACH',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_HEADERS_TIMEOUT',
  'UND_ERR_BODY_TIMEOUT',
  'UND_ERR_SOCKET',
]);

const getExchangeRetryDelay = (error: Error): number | null => {
  if (Boom.isBoom(error)) {
    const { statusCode, payload, headers } = error.output;
    const parsed = exchangeErrorResponseSchema.safeParse(payload);
    if (
      (parsed.success && TERMINAL_EXCHANGE_CODES.has(parsed.data.error.code)) ||
      !RETRYABLE_EXCHANGE_STATUSES.has(statusCode)
    ) {
      return null;
    }

    const retryAfter = headers['retry-after'];
    if (typeof retryAfter !== 'string' || retryAfter.trim() === '') {
      return 0;
    }

    const delay = /^\d+$/.test(retryAfter.trim())
      ? Number(retryAfter) * 1000
      : Date.parse(retryAfter) - Date.now();
    return Number.isFinite(delay) && delay > 0 ? delay : 0;
  }

  // Native fetch wraps transport failures in a TypeError with the socket error as its cause.
  return [error, error.cause].some(
    (cause) =>
      typeof cause === 'object' &&
      cause !== null &&
      'code' in cause &&
      typeof cause.code === 'string' &&
      RETRYABLE_TRANSPORT_CODES.has(cause.code)
  )
    ? 0
    : null;
};
