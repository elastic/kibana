/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientContextMock } from '../../../rules_client/rules_client.mock';
import type { RulesClientContext } from '../../../rules_client/types';
import { GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import { AlertingAuthorizationEntity, ReadOperations } from '../../../authorization';
import { GapAutoFillSchedulerAuditAction } from '../../../rules_client/common/audit_events';
import type { GapAutoFillSchedulerSO } from '../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import { getGapAutoFillSchedulerSO } from './utils';

describe('getGapAutoFillSchedulerSO', () => {
  let context: jest.Mocked<RulesClientContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    context = rulesClientContextMock.create();
  });

  const createSchedulerSo = (
    overrides: Partial<GapAutoFillSchedulerSO> = {}
  ): GapAutoFillSchedulerSO => ({
    id: 'gap-1',
    name: 'auto-fill',
    enabled: true,
    schedule: { interval: '1h' },
    gapFillRange: 'now-1d',
    maxBackfills: 100,
    numRetries: 3,
    scope: ['scope-1'],
    ruleTypes: [
      { type: 'test-rule-type1', consumer: 'test-consumer' },
      { type: 'test-rule-type2', consumer: 'test-consumer' },
    ],
    ruleTypeConsumerPairs: ['test-rule-type1:test-consumer', 'test-rule-type2:test-consumer'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'elastic',
    updatedBy: 'elastic',
    ...overrides,
  });

  test('fetches scheduler SO and performs authorization for each rule type', async () => {
    const so = {
      id: 'gap-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      attributes: createSchedulerSo(),
      references: [],
    };

    const getMock = context.unsecuredSavedObjectsClient.get as jest.Mock;
    getMock.mockResolvedValue(so);

    const result = await getGapAutoFillSchedulerSO({
      context,
      id: 'gap-1',
      operation: ReadOperations.GetGapAutoFillScheduler,
      authAuditAction: GapAutoFillSchedulerAuditAction.GET,
    });

    expect(context.unsecuredSavedObjectsClient.get).toHaveBeenCalledWith(
      GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      'gap-1'
    );

    expect(context.authorization.ensureAuthorized).toHaveBeenCalledTimes(2);
    expect(context.authorization.ensureAuthorized).toHaveBeenNthCalledWith(1, {
      ruleTypeId: 'test-rule-type1',
      consumer: 'test-consumer',
      operation: ReadOperations.GetGapAutoFillScheduler,
      entity: AlertingAuthorizationEntity.Rule,
    });
    expect(context.authorization.ensureAuthorized).toHaveBeenNthCalledWith(2, {
      ruleTypeId: 'test-rule-type2',
      consumer: 'test-consumer',
      operation: ReadOperations.GetGapAutoFillScheduler,
      entity: AlertingAuthorizationEntity.Rule,
    });

    expect(context.auditLogger?.log).not.toHaveBeenCalled();
    expect(result).toBe(so);
  });

  test('audits and throws when saved object has error payload', async () => {
    const soWithError = {
      id: 'gap-1',
      type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
      error: { error: 'err', message: 'Unable to get', statusCode: 404 },
      attributes: createSchedulerSo(),
      references: [],
    };

    const getMock = context.unsecuredSavedObjectsClient.get as jest.Mock;
    getMock.mockResolvedValue(soWithError);

    await expect(
      getGapAutoFillSchedulerSO({
        context,
        id: 'gap-1',
        operation: ReadOperations.GetGapAutoFillScheduler,
        authAuditAction: GapAutoFillSchedulerAuditAction.GET,
      })
    ).rejects.toThrowError('Unable to get');

    expect(context.authorization.ensureAuthorized).not.toHaveBeenCalled();

    expect(context.auditLogger?.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({ action: GapAutoFillSchedulerAuditAction.GET }),
        error: expect.objectContaining({ message: 'Unable to get' }),
        kibana: expect.objectContaining({
          saved_object: expect.objectContaining({
            type: GAP_AUTO_FILL_SCHEDULER_SAVED_OBJECT_TYPE,
            id: 'gap-1',
            name: 'gap-1',
          }),
        }),
      })
    );
  });
});
