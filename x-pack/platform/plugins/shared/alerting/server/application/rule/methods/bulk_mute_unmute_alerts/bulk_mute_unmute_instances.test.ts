/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type { RulesClientContext } from '../../../../rules_client';
import { bulkGetRulesSo, bulkUpdateRuleSo } from '../../../../data/rule';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { retryIfBulkEditConflicts } from '../../../../rules_client/common';
import { bulkMuteUnmuteInstances } from './bulk_mute_unmute_instances';

jest.mock('../../../../data/rule', () => ({
  bulkGetRulesSo: jest.fn(),
  bulkUpdateRuleSo: jest.fn(),
}));
const bulkGetRulesSoMock = bulkGetRulesSo as jest.Mock;
const bulkUpdateRuleSoMock = bulkUpdateRuleSo as jest.Mock;

jest.mock('../../../../rules_client/common', () => ({
  ...jest.requireActual('../../../../rules_client/common'),
  retryIfBulkEditConflicts: jest.fn(),
}));
const retryIfBulkEditConflictsMock = retryIfBulkEditConflicts as jest.Mock;

jest.mock('./transforms/transform_rule_mute_instance_ids', () => ({
  transformMuteRequestToRuleAttributes: jest.fn(),
}));

jest.mock('./transforms/transform_rule_unmute_instance_ids', () => ({
  transformUnmuteRequestToRuleAttributes: jest.fn(),
}));

describe('bulkMuteUnmuteInstances', () => {
  const loggerErrorMock = jest.fn();
  const unsecuredSavedObjectsClient = savedObjectsRepositoryMock.create();
  const auditLoggerMock = { log: jest.fn() };
  const authorizationMock = { bulkEnsureAuthorized: jest.fn() };
  const actionsAuthorizationMock = { ensureAuthorized: jest.fn() };
  const ruleTypeRegistryMock = { ensureRuleTypeEnabled: jest.fn() };
  const getAlertIndicesAliasMock = jest.fn().mockReturnValue(['.alerts-default']);
  const muteAlertInstancesMock = jest.fn();
  const unmuteAlertInstancesMock = jest.fn();
  const alertsServiceMock = {
    isExistingAlert: jest.fn(),
    muteAlertInstances: muteAlertInstancesMock,
    unmuteAlertInstances: unmuteAlertInstancesMock,
  };

  const context = {
    logger: { error: loggerErrorMock, debug: jest.fn() },
    unsecuredSavedObjectsClient,
    authorization: authorizationMock,
    actionsAuthorization: actionsAuthorizationMock,
    auditLogger: auditLoggerMock,
    ruleTypeRegistry: ruleTypeRegistryMock,
    getAlertIndicesAlias: getAlertIndicesAliasMock,
    getUserName: async () => 'test_user',
    alertsService: alertsServiceMock,
    spaceId: 'default',
  } as unknown as RulesClientContext;

  beforeEach(() => {
    jest.resetAllMocks();
    getAlertIndicesAliasMock.mockReturnValue(['.alerts-default']);
    retryIfBulkEditConflictsMock.mockImplementation(async (logger, description, thing) => thing());
  });

  describe('when muting', () => {
    const mute = true;

    test('should call alertsService.muteAlertInstances with the correct parameters', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      await bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute,
      });

      expect(bulkGetRulesSoMock).toHaveBeenCalledWith({
        savedObjectsClient: unsecuredSavedObjectsClient,
        ids: [ruleId],
      });

      expect(authorizationMock.bulkEnsureAuthorized).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: [{ ruleTypeId: 'test', consumers: ['test'] }],
        operation: 'muteAlert',
        entity: 'rule',
      });

      expect(bulkUpdateRuleSoMock).toHaveBeenCalled();
      expect(muteAlertInstancesMock).toHaveBeenCalledTimes(1);
      expect(muteAlertInstancesMock).toHaveBeenCalledWith({
        targets: [{ ruleId, alertInstanceIds }],
        indices: ['.alerts-default'],
        logger: context.logger,
      });
      expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if authorization fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Not authorized');

      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [
          {
            id: ruleId,
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              alertTypeId: 'test',
              consumer: 'test',
              name: 'test rule',
            },
            references: [],
          },
        ],
      });
      authorizationMock.bulkEnsureAuthorized.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrowError(expectedError);

      expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if alertsService.muteAlertInstances fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Failed to mute alerts');

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      muteAlertInstancesMock.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrowError(expectedError);
    });
  });

  describe('when unmuting', () => {
    const mute = false;

    test('should call alertsService.unmuteAlertInstances with the correct parameters', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      await bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute,
      });

      expect(bulkGetRulesSoMock).toHaveBeenCalledWith({
        savedObjectsClient: unsecuredSavedObjectsClient,
        ids: [ruleId],
      });

      expect(authorizationMock.bulkEnsureAuthorized).toHaveBeenCalledWith({
        ruleTypeIdConsumersPairs: [{ ruleTypeId: 'test', consumers: ['test'] }],
        operation: 'unmuteAlert',
        entity: 'rule',
      });

      expect(bulkUpdateRuleSoMock).toHaveBeenCalled();
      expect(unmuteAlertInstancesMock).toHaveBeenCalledTimes(1);
      expect(unmuteAlertInstancesMock).toHaveBeenCalledWith({
        targets: [{ ruleId, alertInstanceIds }],
        indices: ['.alerts-default'],
        logger: context.logger,
      });
      expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if authorization fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Not authorized');

      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [
          {
            id: ruleId,
            type: RULE_SAVED_OBJECT_TYPE,
            attributes: {
              alertTypeId: 'test',
              consumer: 'test',
              name: 'test rule',
            },
            references: [],
          },
        ],
      });
      authorizationMock.bulkEnsureAuthorized.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrowError(expectedError);

      expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
    });

    test('should re-throw an error if alertsService.unmuteAlertInstances fails', async () => {
      const ruleId = 'rule-1';
      const alertInstanceIds = ['instance-1', 'instance-2'];
      const expectedError = new Error('Failed to unmute alerts');

      const rule = {
        id: ruleId,
        type: RULE_SAVED_OBJECT_TYPE,
        attributes: {
          alertTypeId: 'test',
          consumer: 'test',
          name: 'test rule',
        },
        references: [],
      };
      bulkGetRulesSoMock.mockResolvedValueOnce({
        saved_objects: [rule],
      });

      bulkUpdateRuleSoMock.mockResolvedValueOnce({ saved_objects: [rule] });

      unmuteAlertInstancesMock.mockRejectedValue(expectedError);

      await expect(
        bulkMuteUnmuteInstances(context, {
          params: { rules: [{ id: ruleId, alertInstanceIds }] },
          mute,
        })
      ).rejects.toThrowError(expectedError);
    });
  });

  // Shared tests
  test('should throw error if rules are not found', async () => {
    const ruleId = 'rule-1';
    const alertInstanceIds = ['instance-1', 'instance-2'];

    bulkGetRulesSoMock.mockResolvedValueOnce({
      saved_objects: [],
    });

    await expect(
      bulkMuteUnmuteInstances(context, {
        params: { rules: [{ id: ruleId, alertInstanceIds }] },
        mute: true,
      })
    ).rejects.toThrowError(`Rules not found: ["${ruleId}"]`);
  });

  test('should do nothing if an empty rules array is provided', async () => {
    await bulkMuteUnmuteInstances(context, { params: { rules: [] }, mute: true });

    expect(bulkGetRulesSoMock).not.toHaveBeenCalled();
    expect(authorizationMock.bulkEnsureAuthorized).not.toHaveBeenCalled();
    expect(bulkUpdateRuleSoMock).not.toHaveBeenCalled();
    expect(muteAlertInstancesMock).not.toHaveBeenCalled();
    expect(unmuteAlertInstancesMock).not.toHaveBeenCalled();
  });
});
