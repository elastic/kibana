/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecoveredActionGroup } from '../../../../../common';
import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import type { RulesClientContext } from '../../../../rules_client/types';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { transformToSanitizedRule } from './utils';
import type { getRuleSo } from '../../../../data/rule';
import { formatLegacyActions } from '../../../../rules_client/lib';
import { AlertConsumers } from '@kbn/rule-data-utils';

type RuleSo = Awaited<ReturnType<typeof getRuleSo>>;

jest.mock('../../../../rules_client/lib', () => {
  return {
    formatLegacyActions: jest.fn(),
  };
});

const formatLegacyActionsMock = formatLegacyActions as jest.Mock;

const getTestRule = (overrides?: { consumer?: string }) => {
  const attributes = {
    alertTypeId: '123',
    schedule: { interval: '10s' },
    params: {
      bar: true,
    },
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    actions: [
      {
        group: 'default',
        actionRef: 'action_0',
        params: {
          foo: true,
        },
      },
    ],
    notifyWhen: 'onActiveAlert',
    consumer: overrides?.consumer,
  };
  const ruleSo = {
    id: '1',
    type: RULE_SAVED_OBJECT_TYPE,
    attributes,
    references: [
      {
        name: 'action_0',
        type: 'action',
        id: '1',
      },
    ],
  } as unknown as RuleSo;

  const sanitized = {
    actions: attributes.actions.map((action) => ({
      actionTypeId: undefined,
      group: action.group,
      id: ruleSo.references.find((ref) => ref.name === action.actionRef)?.id,
      params: action.params,
      uuid: undefined,
    })),
    alertTypeId: attributes.alertTypeId,
    artifacts: {
      dashboards: [],
      investigation_guide: { blob: '' },
    },
    createdAt: new Date(attributes.createdAt),
    executionStatus: {
      lastExecutionDate: new Date(attributes.executionStatus.lastExecutionDate),
      status: attributes.executionStatus.status,
    },
    id: ruleSo.id,
    notifyWhen: attributes.notifyWhen,
    params: {
      ...attributes.params,
      parameterThatIsSavedObjectId: '9',
    },
    schedule: attributes.schedule,
    systemActions: [],
    updatedAt: new Date(attributes.updatedAt),
    consumer: ruleSo.attributes.consumer,
  };

  return {
    so: ruleSo,
    sanitized,
  };
};

let rulesClientContext: RulesClientContext;
let expectedSanitizedRule: ReturnType<typeof getTestRule>['sanitized'];
let result: Awaited<ReturnType<typeof transformToSanitizedRule>>;

const options = { includeLegacyId: true, includeSnoozeData: true, excludeFromPublicApi: true };

describe('transformToSanitizedRule', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    rulesClientContext = rulesClientContextMock.create();
    const injectReferencesFn = jest.fn().mockReturnValue({
      bar: true,
      parameterThatIsSavedObjectId: '9',
    });
    const getRuleTypeRegistryMock = rulesClientContext.ruleTypeRegistry.get as jest.Mock;
    getRuleTypeRegistryMock.mockImplementation(() => ({
      id: '123',
      name: 'Test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: RecoveredActionGroup,
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      async executor() {
        return { state: {} };
      },
      category: 'test',
      producer: 'alerts',
      solution: 'stack',
      useSavedObjectReferences: {
        extractReferences: jest.fn(),
        injectReferences: injectReferencesFn,
      },
      validate: {
        params: { validate: () => {} },
      },
      validLegacyConsumers: [],
    }));

    const { so, sanitized } = getTestRule();
    expectedSanitizedRule = sanitized;

    result = await transformToSanitizedRule(rulesClientContext, so, options);
  });

  it('should transform the rule saved object to a SanitizedRule', () => {
    expect(result).toEqual(expectedSanitizedRule);
  });

  it('should handle validation errors on the rule domain', () => {
    expect(rulesClientContext.logger.warn).toHaveBeenCalledWith(
      'Error validating get rule domain object for id: 1, Error: [enabled]: expected value of type [boolean] but got [undefined]'
    );
  });

  it('should not format legacy actions for non SIEM rules', () => {
    expect(formatLegacyActionsMock).not.toHaveBeenCalled();
  });

  describe('when the rule is a SIEM rule', () => {
    let sanitizedRule: ReturnType<typeof getTestRule>['sanitized'];
    beforeEach(async () => {
      const { so, sanitized } = getTestRule({ consumer: AlertConsumers.SIEM });
      sanitizedRule = sanitized;
      expectedSanitizedRule = {} as typeof expectedSanitizedRule;
      formatLegacyActionsMock.mockResolvedValueOnce([expectedSanitizedRule]);
      result = await transformToSanitizedRule(rulesClientContext, so, options);
    });
    it('should attempt to format legacy actions', () => {
      expect(formatLegacyActionsMock).toHaveBeenCalledTimes(1);
      expect(formatLegacyActionsMock).toHaveBeenCalledWith([sanitizedRule], {
        savedObjectsClient: rulesClientContext.unsecuredSavedObjectsClient,
        logger: rulesClientContext.logger,
      });
    });

    it('should return the migrated rule', () => {
      expect(result).toBe(expectedSanitizedRule);
    });
  });
});
