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
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';
import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS, ServiceAccountFakeRequests } from './fake_requests';
import { SERVICE_ACCOUNT_ROLE_ASSIGNMENTS } from './role_assignments';
import type { CloudProjectContext, ServiceAccountsBackend } from './types';
import type { SecurityLicense } from '../../common';
import {
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
  serviceAccountIdSchema,
  serviceAccountNameSchema,
} from '../../common/service_accounts';
import { getDetailedErrorMessage } from '../errors';
import {
  getUiamAuthorizationHeaderFromRequest,
  isExternalApiKey,
  type UiamServicePublic,
} from '../uiam';

/** Checks UIAM response compatibility without failing an already successful creation. */
const serviceAccountSchema = z.object({
  id: serviceAccountIdSchema,
  type: z.literal('project'),
  name: serviceAccountNameSchema,
  organization_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
  role_assignments: z.record(z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH), z.unknown()),
  assumable_by: z.array(
    z.discriminatedUnion('type', [
      z.object({
        type: z.literal('project-service-account'),
        organization_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        project_type: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        project_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
      }),
      z.object({
        type: z.literal('platform-service-account'),
        service_account_id: serviceAccountIdSchema,
      }),
    ])
  ),
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

export interface UiamServiceAccountsOptions {
  logger: Logger;
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
    this.fakeRequests = new ServiceAccountFakeRequests(logger, async (serviceAccountId) => {
      const { token } = await this.exchangeToken(serviceAccountId);
      return token;
    });
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

    const authorization = getUiamAuthorizationHeaderFromRequest(request);

    const { hasAllRequested } = await this.checkPrivilegesWithRequest(request).globally({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });

    if (!hasAllRequested) {
      this.logger.warn(
        'Service account creation denied: missing `manage_security` cluster privilege'
      );
      throw Boom.forbidden(
        'Cannot create a service account: missing `manage_security` cluster privilege'
      );
    }

    this.logger.debug('Attempting to create a service account');

    try {
      const result = await this.uiam.createServiceAccount(
        authorization,
        {
          organization_id: this.cloudProjectContext.organizationId,
          name: params.name,
          role_assignments: SERVICE_ACCOUNT_ROLE_ASSIGNMENTS,
          assumable_by: buildAssumableBy(this.cloudProjectContext),
        },
        { includeClientAuthentication: !isExternalApiKey(this.getCurrentUser(request)) }
      );

      const parsed = serviceAccountSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account payload from UIAM failed validation: ${parsed.error.message}`
        );
        return result;
      }

      return parsed.data;
    } catch (e) {
      this.logger.error(`Failed to create service account: ${getDetailedErrorMessage(e)}`);
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

    this.logger.debug('Attempting to exchange a service account for an ephemeral token');

    try {
      const result = await this.uiam.exchangeServiceAccountToken(serviceAccountId);

      const parsed = exchangeTokenResponseSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Token exchange payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw new Error(`Error occured during service account token exchange.`);
      }

      return parsed.data;
    } catch (e) {
      this.logger.error(`Failed to exchange service account token: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async createFakeRequest(params: CreateServiceAccountFakeRequestParams): Promise<KibanaRequest> {
    // The license gate is enforced by `exchangeToken`, which mints the initial credential.
    return await this.fakeRequests.create(params);
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
    } catch (e) {
      this.logger.warn(
        `Failed to replace the token of a service account bound fake request: ${getDetailedErrorMessage(
          e
        )}`
      );
      return null;
    }
  }
}
