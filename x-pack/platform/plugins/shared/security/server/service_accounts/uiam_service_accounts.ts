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
  ExchangeServiceAccountTokenResponse,
  ServiceAccount,
  UiamOAuthProjectType,
} from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';
import { z } from '@kbn/zod';

import { buildAssumableBy } from './assumable_by';
import type { ServiceAccountsBackend } from './types';
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
      z.object({
        type: z.literal('project-service-account'),
        organization_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        project_type: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
        project_id: z.string().max(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH),
      })
    )
    .max(1),
});

/**
 * Response shape of the UIAM token exchange, derived from the API specification for the
 * same reason as {@link serviceAccountSchema}: the upstream endpoint is not implemented
 * yet, so validation makes the first real call fail loudly on any drift.
 *
 * TODO(https://github.com/elastic/kibana/issues/284465): revisit once UIAM ships
 * the endpoint and the response shape is confirmed.
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

    const accessToken = getUiamAccessTokenFromRequest(request);

    const { hasAllRequested } = await this.checkPrivilegesWithRequest(request).globally({
      elasticsearch: { cluster: ['manage_security'], index: {} },
    });

    if (!hasAllRequested) {
      throw Boom.forbidden(
        'Cannot create a service account: missing `manage_security` cluster privilege'
      );
    }

    this.logger.debug('Attempting to create a service account');

    try {
      const result = await this.uiam.createServiceAccount(accessToken, {
        name: params.name,
        role_assignments: params.role_assignments,
        assumable_by: buildAssumableBy({
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

  async exchangeToken(serviceAccountId: string): Promise<ExchangeServiceAccountTokenResponse> {
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
}
