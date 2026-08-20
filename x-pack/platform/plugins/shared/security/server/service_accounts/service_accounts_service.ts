/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { UiamOAuthProjectType } from '@kbn/core-security-server';
import type { CheckPrivilegesWithRequest } from '@kbn/security-plugin-types-server';

import { EsServiceAccounts } from './es_service_accounts';
import type { ServiceAccountsServiceStart } from './types';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import type { ConfigType } from '../config';
import type { UiamServicePublic } from '../uiam';

export interface ServiceAccountsServiceStartParams {
  config: ConfigType;
  license: SecurityLicense;
  /** The UIAM service, when UIAM is configured for this deployment. */
  uiam?: UiamServicePublic;
  checkPrivilegesWithRequest: CheckPrivilegesWithRequest;
  organizationId?: string;
  projectId?: string;
  projectType?: UiamOAuthProjectType;
}

export class ServiceAccountsService {
  constructor(private readonly logger: Logger) {}

  /**
   * Returns the service account management API, or `null` when service accounts
   * are not enabled for this deployment.
   */
  start({
    config,
    license,
    uiam,
    checkPrivilegesWithRequest,
    organizationId,
    projectId,
    projectType,
  }: ServiceAccountsServiceStartParams): ServiceAccountsServiceStart | null {
    if (config.serviceAccounts?.enabled !== true) {
      this.logger.debug('Service accounts are not enabled.');
      return null;
    }

    // Backend selection keys off UIAM availability rather than the build flavor, so
    // that the Elasticsearch path is reachable and testable before it is finished.
    if (!uiam || !organizationId || !projectId || !projectType) {
      this.logger.debug(
        'UIAM is not available; falling back to the Elasticsearch service accounts backend.'
      );
      return new EsServiceAccounts();
    }

    return new UiamServiceAccounts({
      logger: this.logger,
      license,
      uiam,
      checkPrivilegesWithRequest,
      organizationId,
      projectId,
      projectType,
    });
  }
}
