/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { RuleChangeTrackingAction } from '@kbn/alerting-types';
import type { RawRule } from '../../../../types';
import type { RulesClientContext } from '../../../../rules_client/types';
import type { IScopedChangeTrackingService } from '../../../../rules_client/lib/change_tracking';
import { RULE_SAVED_OBJECT_TYPE } from '../../../../saved_objects';
import { logBulkRuleChanges } from './log_bulk_rule_changes';

describe('logBulkRuleChanges', () => {
  let changeTrackingService: jest.Mocked<IScopedChangeTrackingService>;

  beforeEach(() => {
    changeTrackingService = createMockChangeTrackingService();
  });

  it('logs every successful saved object in a single bulk call', async () => {
    const context = buildContext({ changeTrackingService });
    const ruleSOs = [buildRuleSO('rule-1'), buildRuleSO('rule-2')];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleDelete,
    });

    expect(changeTrackingService.logBulk).toHaveBeenCalledTimes(1);
    const [changes, opts] = changeTrackingService.logBulk.mock.calls[0];
    expect(changes).toEqual([
      {
        objectId: 'rule-1',
        objectType: RULE_SAVED_OBJECT_TYPE,
        module: 'stack',
        snapshot: { attributes: expect.objectContaining({ name: 'rule rule-1' }), references: [] },
      },
      {
        objectId: 'rule-2',
        objectType: RULE_SAVED_OBJECT_TYPE,
        module: 'stack',
        snapshot: { attributes: expect.objectContaining({ name: 'rule rule-2' }), references: [] },
      },
    ]);
    expect(opts).toEqual({
      action: RuleChangeTrackingAction.ruleDelete,
      spaceId: 'default',
      data: { metadata: { bulkCount: ruleSOs.length } },
    });
  });

  it('skips saved objects that have an error (e.g. partial bulk failures)', async () => {
    const context = buildContext({ changeTrackingService });
    const ruleSOs = [
      buildRuleSO('rule-1'),
      buildErroredRuleSO('rule-failed'),
      buildRuleSO('rule-3'),
    ];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleDisable,
    });

    expect(changeTrackingService.logBulk).toHaveBeenCalledTimes(1);
    const [changes, opts] = changeTrackingService.logBulk.mock.calls[0];
    expect(changes.map((c) => c.objectId)).toEqual(['rule-1', 'rule-3']);
    // bulkCount reflects the number of saved objects supplied (including failures),
    // matching the behavior callers rely on for telemetry.
    expect(opts.data).toEqual({ metadata: { bulkCount: 3 } });
  });

  it('skips rule types that opt out of change tracking', async () => {
    const context = buildContext(
      { changeTrackingService },
      {
        '123': { solution: 'stack', trackChanges: true },
        '456': { solution: 'security', trackChanges: false },
      }
    );
    const ruleSOs = [buildRuleSO('rule-1', '123'), buildRuleSO('rule-2', '456')];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleEnable,
    });

    expect(changeTrackingService.logBulk).toHaveBeenCalledTimes(1);
    const [changes] = changeTrackingService.logBulk.mock.calls[0];
    expect(changes.map((c) => c.objectId)).toEqual(['rule-1']);
  });

  it('preserves rule type solution per change, supporting mixed solutions in one bulk call', async () => {
    const context = buildContext(
      { changeTrackingService },
      {
        '123': { solution: 'stack', trackChanges: true },
        '456': { solution: 'security', trackChanges: true },
      }
    );
    const ruleSOs = [buildRuleSO('rule-stack', '123'), buildRuleSO('rule-sec', '456')];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleUpdate,
    });

    const [changes] = changeTrackingService.logBulk.mock.calls[0];
    expect(changes).toEqual([
      expect.objectContaining({ objectId: 'rule-stack', module: 'stack' }),
      expect.objectContaining({ objectId: 'rule-sec', module: 'security' }),
    ]);
  });

  it('does not call logBulk when every saved object failed', async () => {
    const context = buildContext({ changeTrackingService });
    const ruleSOs = [buildErroredRuleSO('rule-1'), buildErroredRuleSO('rule-2')];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleDisable,
    });

    expect(changeTrackingService.logBulk).not.toHaveBeenCalled();
  });

  it('does not call logBulk when no rule type opts in to tracking', async () => {
    const context = buildContext(
      { changeTrackingService },
      { '123': { solution: 'stack', trackChanges: false } }
    );
    const ruleSOs = [buildRuleSO('rule-1'), buildRuleSO('rule-2')];

    await logBulkRuleChanges({
      context,
      ruleSOs,
      action: RuleChangeTrackingAction.ruleDelete,
    });

    expect(changeTrackingService.logBulk).not.toHaveBeenCalled();
  });

  it('does not call logBulk when the input is empty', async () => {
    const context = buildContext({ changeTrackingService });

    await logBulkRuleChanges({
      context,
      ruleSOs: [],
      action: RuleChangeTrackingAction.ruleEnable,
    });

    expect(changeTrackingService.logBulk).not.toHaveBeenCalled();
  });

  it('does nothing when the change tracking service is not configured', async () => {
    const context = buildContext({ changeTrackingService: undefined });

    await logBulkRuleChanges({
      context,
      ruleSOs: [buildRuleSO('rule-1')],
      action: RuleChangeTrackingAction.ruleEnable,
    });

    expect(changeTrackingService.logBulk).not.toHaveBeenCalled();
  });

  it('falls back to an empty references array when a saved object omits references', async () => {
    const context = buildContext({ changeTrackingService });
    const ruleSOWithoutRefs = buildRuleSO('rule-1');
    delete (ruleSOWithoutRefs as Partial<SavedObject<RawRule>>).references;

    await logBulkRuleChanges({
      context,
      ruleSOs: [ruleSOWithoutRefs as SavedObject<RawRule>],
      action: RuleChangeTrackingAction.ruleUpdate,
    });

    const [changes] = changeTrackingService.logBulk.mock.calls[0];
    expect(changes[0].snapshot.references).toEqual([]);
  });

  it('swallows registry errors', async () => {
    const ruleTypeRegistry = {
      get: jest.fn().mockImplementation(() => {
        throw new Error('rule type missing');
      }),
      ensureRuleTypeEnabled: jest.fn(),
      has: jest.fn(),
      register: jest.fn(),
      list: jest.fn(),
    } as unknown as RulesClientContext['ruleTypeRegistry'];
    const context = buildContext({ changeTrackingService, ruleTypeRegistry });

    await expect(
      logBulkRuleChanges({
        context,
        ruleSOs: [buildRuleSO('rule-1')],
        action: RuleChangeTrackingAction.ruleDelete,
      })
    ).resolves.toBeUndefined();

    expect(changeTrackingService.logBulk).not.toHaveBeenCalled();
    expect(context.logger.warn).not.toHaveBeenCalled();
  });

  it('swallows changeTrackingService.logBulk errors and warns instead of bubbling them', async () => {
    changeTrackingService.logBulk.mockRejectedValueOnce(new Error('boom'));
    const context = buildContext({ changeTrackingService });

    await expect(
      logBulkRuleChanges({
        context,
        ruleSOs: [buildRuleSO('rule-1')],
        action: RuleChangeTrackingAction.ruleEnable,
      })
    ).resolves.toBeUndefined();

    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Unable to log bulk rule changes for action "${RuleChangeTrackingAction.ruleEnable}"`
      )
    );
  });
});

const buildRuleSO = (
  id: string,
  alertTypeId = '123',
  overrides: Partial<SavedObject<RawRule>> = {}
): SavedObject<RawRule> => ({
  id,
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: { alertTypeId, name: `rule ${id}` } as RawRule,
  references: [],
  ...overrides,
});

const buildErroredRuleSO = (id: string): SavedObject<RawRule> => ({
  id,
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: { alertTypeId: '123' } as RawRule,
  references: [],
  error: { error: 'Conflict', message: 'version_conflict_engine_exception', statusCode: 409 },
});

const createMockChangeTrackingService = (): jest.Mocked<IScopedChangeTrackingService> => ({
  log: jest.fn().mockResolvedValue(undefined),
  logBulk: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
});

interface RuleTypeStub {
  solution: string;
  trackChanges: boolean;
}

const buildContext = (
  overrides: Partial<RulesClientContext> = {},
  ruleTypesByAlertTypeId: Record<string, RuleTypeStub> = {
    '123': { solution: 'stack', trackChanges: true },
  }
): RulesClientContext => {
  const ruleTypeRegistry = {
    get: jest.fn().mockImplementation((alertTypeId: string) => {
      const ruleType = ruleTypesByAlertTypeId[alertTypeId];
      if (!ruleType) {
        throw new Error(`No rule type registered for ${alertTypeId}`);
      }
      return ruleType;
    }),
    ensureRuleTypeEnabled: jest.fn(),
    has: jest.fn(),
    register: jest.fn(),
    list: jest.fn(),
  } as unknown as RulesClientContext['ruleTypeRegistry'];

  return {
    logger: loggingSystemMock.createLogger(),
    spaceId: 'default',
    ruleTypeRegistry,
    ...overrides,
  } as unknown as RulesClientContext;
};
