/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';

import { EsServiceAccounts } from './es_service_accounts';
import { ServiceAccountsService } from './service_accounts_service';
import { UiamServiceAccounts } from './uiam_service_accounts';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('ServiceAccountsService', () => {
  const startParams = (config: Partial<ConfigType>, overrides = {}) => ({
    config: config as ConfigType,
    license: licenseMock.create(),
    uiam: uiamServiceMock.create(),
    organizationId: 'organization-id',
    projectId: 'project-id',
    projectType: 'security' as const,
    ...overrides,
  });

  let service: ServiceAccountsService;

  beforeEach(() => {
    service = new ServiceAccountsService(loggingSystemMock.create().get('service-accounts'));
  });

  describe('#start', () => {
    it('returns null when service accounts are not enabled', () => {
      expect(service.start(startParams({ serviceAccounts: { enabled: false } }))).toBeNull();
    });

    it('returns null when the feature is not configured at all (non-serverless)', () => {
      expect(service.start(startParams({}))).toBeNull();
    });

    it('selects the UIAM backend when UIAM and project context are available', () => {
      expect(service.start(startParams({ serviceAccounts: { enabled: true } }))).toBeInstanceOf(
        UiamServiceAccounts
      );
    });

    it('falls back to the Elasticsearch backend when UIAM is unavailable', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: true } }, { uiam: undefined }))
      ).toBeInstanceOf(EsServiceAccounts);
    });

    it.each(['organizationId', 'projectId', 'projectType'])(
      'falls back to the Elasticsearch backend when `%s` is missing',
      (field) => {
        expect(
          service.start(startParams({ serviceAccounts: { enabled: true } }, { [field]: undefined }))
        ).toBeInstanceOf(EsServiceAccounts);
      }
    );
  });
});
