/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '../../../common';
import type { UntypedNormalizedRuleType } from '../../rule_type_registry';
import { extractReferences } from './extract_references';
import type { RulesClientContext } from '..';
import { savedObjectsRepositoryMock } from '@kbn/core-saved-objects-api-server-mocks';

import { denormalizeArtifacts } from './denormalize_artifacts';

jest.mock('./denormalize_artifacts', () => ({
  denormalizeArtifacts: jest.fn(),
}));

const mockDenormalizeArtifacts = denormalizeArtifacts as jest.Mock;

const loggerErrorMock = jest.fn();
const getBulkMock = jest.fn();

const ruleType: jest.Mocked<UntypedNormalizedRuleType> = {
  id: 'test.rule-type',
  name: 'My test rule',
  actionGroups: [{ id: 'default', name: 'Default' }, RecoveredActionGroup],
  defaultActionGroupId: 'default',
  minimumLicenseRequired: 'basic',
  isExportable: true,
  recoveryActionGroup: RecoveredActionGroup,
  executor: jest.fn(),
  producer: 'alerts',
  solution: 'stack',
  cancelAlertsOnRuleTimeout: true,
  ruleTaskTimeout: '5m',
  autoRecoverAlerts: true,
  doesSetRecoveryContext: true,
  validate: {
    params: { validate: (params) => params },
  },
  alerts: {
    context: 'test',
    mappings: { fieldMap: { field: { type: 'keyword', required: false } } },
    shouldWrite: true,
  },
  category: 'test',
  validLegacyConsumers: [],
};

const context = {
  logger: { error: loggerErrorMock },
  getActionsClient: () => {
    return {
      getBulk: getBulkMock,
    };
  },
  unsecuredSavedObjectsClient: savedObjectsRepositoryMock.create(),
  authorization: { ensureAuthorized: async () => {} },
  ruleTypeRegistry: {
    ensureRuleTypeEnabled: () => {},
  },
  getUserName: async () => {},
} as unknown as RulesClientContext;

jest.mock('./denormalize_artifacts', () => ({
  denormalizeArtifacts: jest.fn(),
}));

describe('extractReferences', () => {
  it('returns dashboard artifacts and references', async () => {
    mockDenormalizeArtifacts.mockReturnValue({
      artifacts: {
        dashboards: [
          {
            refId: 'dashboard_0',
          },
          {
            refId: 'dashboard_1',
          },
        ],
      },
      references: [
        {
          id: '123',
          name: 'dashboard_0',
          type: 'dashboard',
        },
        {
          id: '456',
          name: 'dashboard_1',
          type: 'dashboard',
        },
      ],
    });

    const result = await extractReferences(
      context,
      ruleType,
      [],
      {},
      {
        dashboards: [{ id: '123' }],
      }
    );

    expect(mockDenormalizeArtifacts).toHaveBeenCalled();
    expect(result.artifacts).toEqual({
      dashboards: [
        {
          refId: 'dashboard_0',
        },
        {
          refId: 'dashboard_1',
        },
      ],
    });

    expect(result.references).toEqual([
      {
        id: '123',
        name: 'dashboard_0',
        type: 'dashboard',
      },
      {
        id: '456',
        name: 'dashboard_1',
        type: 'dashboard',
      },
    ]);
  });
});
