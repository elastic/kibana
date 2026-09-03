/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type {
  CreateServiceAccountParams,
  ServiceAccount,
  UiamOAuthProjectType,
} from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { buildAssumableBy } from './assumable_by';
import type { CreateServiceAccountFakeRequestParams } from './fake_requests';
import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS, ServiceAccountFakeRequests } from './fake_requests';
import { SERVICE_ACCOUNT_ROLE_ASSIGNMENTS } from './role_assignments';
import type {
  ListedServiceAccount,
  ListServiceAccountsParams,
  ListServiceAccountsResult,
  ServiceAccountsBackend,
} from './types';
import type { SecurityLicense } from '../../common';
import {
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
} from '../../common/service_accounts';
import { getDetailedErrorMessage } from '../errors';
import { getUiamAccessTokenFromRequest, type UiamServicePublic } from '../uiam';

/**
 * Validates the payload UIAM returns, so that a shape change fails loudly here rather than leaking
 * partially-undefined objects to consumers. Verified against image
 * `docker.elastic.co/cloud-ci/uiam:git-a67a2f75a615`, whose create response carries exactly the
 * fields below; anything UIAM adds later is stripped rather than passed through, so consumers only
 * ever see documented fields.
 */
const serviceAccountSchema = z.object({
  id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
  type: z.literal('project'),
  name: z.string().max(SERVICE_ACCOUNT_NAME_MAX_LENGTH),
  organization_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
  role_assignments: z.record(z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH), z.unknown()),
  assumable_by: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('project-service-account'),
          organization_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
          project_type: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
          project_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        }),
        z.object({
          type: z.literal('platform-service-account'),
          service_account_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        }),
      ])
    )
    // Raised from 1 to accommodate caller-supplied `assumable_by` (POC). The default
    // `buildAssumableBy` still produces exactly one entry; this cap prevents runaway input.
    .max(10),
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

const listedServiceAccountSchema = serviceAccountSchema.extend({
  creator: serviceAccountCreatorSchema,
});

const listServiceAccountsResponseSchema = z.object({
  service_accounts: z.array(listedServiceAccountSchema),
  after: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH).optional(),
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
  organizationId: string;
  projectId: string;
  projectType: UiamOAuthProjectType;
}

export class UiamServiceAccounts implements ServiceAccountsBackend {
  private readonly logger: Logger;
  private readonly license: SecurityLicense;
  private readonly uiam: UiamServicePublic;
  private readonly checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  private readonly organizationId: string;
  private readonly projectId: string;
  private readonly projectType: UiamOAuthProjectType;
  private readonly fakeRequests: ServiceAccountFakeRequests;

  constructor({
    logger,
    license,
    uiam,
    checkPrivilegesWithRequest,
    organizationId,
    projectId,
    projectType,
  }: UiamServiceAccountsOptions) {
    this.logger = logger;
    this.license = license;
    this.uiam = uiam;
    this.checkPrivilegesWithRequest = checkPrivilegesWithRequest;
    this.organizationId = organizationId;
    this.projectId = projectId;
    this.projectType = projectType;
    this.fakeRequests = new ServiceAccountFakeRequests(logger, async (serviceAccountId) => {
      const { token } = await this.exchangeToken(serviceAccountId);
      return token;
    });
  }

  async create(
    request: KibanaRequest,
    params: CreateServiceAccountParams
  ): Promise<ServiceAccount> {
    this.assertLicenseEnabled('create a service account');
    const accessToken = getUiamAccessTokenFromRequest(request);
    await this.assertManageSecurityPrivilege(request, 'create a service account');

    this.logger.debug('Attempting to create a service account');

    try {
      const result = await this.uiam.createServiceAccount(accessToken, {
        name: params.name,
        role_assignments: SERVICE_ACCOUNT_ROLE_ASSIGNMENTS,
        // POC: use the caller's `assumable_by` when provided; otherwise default to the current
        // Kibana project. This lets an out-of-process assumer (e.g. the Nightshift Relay) be
        // named by the caller. See CreateServiceAccountParams.assumable_by for the full caveat.
        assumable_by: params.assumable_by
          ? [
              ...params.assumable_by,
              ...buildAssumableBy({
                organizationId: this.organizationId,
                projectId: this.projectId,
                projectType: this.projectType,
              }),
            ]
          : buildAssumableBy({
              organizationId: this.organizationId,
              projectId: this.projectId,
              projectType: this.projectType,
            }),
      });

      const parsed = serviceAccountSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw new Error(`Error occured during service account creation.`);
      }

      return parsed.data;
    } catch (e) {
      this.logger.error(`Failed to create service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async list(
    request: KibanaRequest,
    params: ListServiceAccountsParams = {}
  ): Promise<ListServiceAccountsResult> {
    this.assertLicenseEnabled('list service accounts');
    await this.assertManageSecurityPrivilege(request, 'list service accounts');

    this.logger.debug('Attempting to list service accounts');

    try {
      const result = await this.uiam.listServiceAccounts(params);
      const parsed = listServiceAccountsResponseSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account list payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw new Error(`Error occured during service account listing.`);
      }

      return parsed.data;
    } catch (e) {
      this.logger.error(`Failed to list service accounts: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  async get(request: KibanaRequest, id: string): Promise<ListedServiceAccount> {
    this.assertLicenseEnabled('get a service account');
    await this.assertManageSecurityPrivilege(request, 'get a service account');

    this.logger.debug(`Attempting to get service account ${id}`);

    try {
      const result = await this.uiam.getServiceAccount(id);
      const parsed = listedServiceAccountSchema.safeParse(result);
      if (!parsed.success) {
        this.logger.error(
          `Service account payload from UIAM failed validation: ${parsed.error.message}`
        );
        throw new Error(`Error occured during service account retrieval.`);
      }

      return parsed.data;
    } catch (e) {
      this.logger.error(`Failed to get service account: ${getDetailedErrorMessage(e)}`);
      throw e;
    }
  }

  private assertLicenseEnabled(action: string): void {
    if (!this.license.isEnabled()) {
      throw Boom.forbidden(`Cannot ${action}: security features are disabled in Elasticsearch`);
    }
  }

  private async assertManageSecurityPrivilege(
    request: KibanaRequest,
    action: string
  ): Promise<void> {
    const { hasAllRequested } = await this.checkPrivilegesWithRequest(request).globally({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(`Cannot ${action}: missing \`manage_security\` cluster privilege`);
    }
  }

  /**
   * POC ONLY. Exchanges the service account ID for an ephemeral access token under Kibana's own
   * system credential. Made public so the token can be handed to an out-of-process consumer (e.g.
   * the Nightshift Relay). See {@link CoreServiceAccountsService.exchangeToken} for the full
   * rationale and the caveats that apply before this can ship. In-process consumers should use
   * `createFakeRequest` instead, which manages the token lifecycle transparently.
   */
  async exchangeToken(serviceAccountId: string): Promise<{ token: string }> {
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
