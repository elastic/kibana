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
import { logRuleChange } from './log_rule_change';

describe('logRuleChange', () => {
  let changeTrackingService: jest.Mocked<IScopedChangeTrackingService>;

  beforeEach(() => {
    changeTrackingService = createMockChangeTrackingService();
  });

  it('logs the change when service is set and rule type opts in to tracking', async () => {
    const context = buildContext({ changeTrackingService });

    await logRuleChange({
      context,
      ruleSO: buildRuleSO(),
      action: RuleChangeTrackingAction.ruleCreate,
    });

    expect(changeTrackingService.log).toHaveBeenCalledTimes(1);
    expect(changeTrackingService.log).toHaveBeenCalledWith(
      {
        objectId: 'rule-1',
        objectType: RULE_SAVED_OBJECT_TYPE,
        module: 'stack',
        snapshot: {
          attributes: { alertTypeId: '123', name: 'rule one' },
          references: [{ id: 'action-1', name: 'action_0', type: 'action' }],
        },
      },
      {
        action: RuleChangeTrackingAction.ruleCreate,
        spaceId: 'default',
      }
    );
  });

  it('falls back to an empty references array when the saved object omits references', async () => {
    const context = buildContext({ changeTrackingService });
    const ruleSOWithoutRefs = buildRuleSO();
    delete (ruleSOWithoutRefs as Partial<SavedObject<RawRule>>).references;

    await logRuleChange({
      context,
      ruleSO: ruleSOWithoutRefs as SavedObject<RawRule>,
      action: RuleChangeTrackingAction.ruleUpdate,
    });

    expect(changeTrackingService.log).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshot: expect.objectContaining({ references: [] }),
      }),
      expect.anything()
    );
  });

  it('does nothing when the change tracking service is not configured', async () => {
    const context = buildContext({ changeTrackingService: undefined });

    await logRuleChange({
      context,
      ruleSO: buildRuleSO(),
      action: RuleChangeTrackingAction.ruleCreate,
    });

    expect(changeTrackingService.log).not.toHaveBeenCalled();
  });

  it('does not log when the rule type opts out of change tracking', async () => {
    const context = buildContext(
      { changeTrackingService },
      { solution: 'stack', trackChanges: false }
    );

    await logRuleChange({
      context,
      ruleSO: buildRuleSO(),
      action: RuleChangeTrackingAction.ruleCreate,
    });

    expect(changeTrackingService.log).not.toHaveBeenCalled();
  });

  it('uses the rule type solution as the change module', async () => {
    const context = buildContext(
      { changeTrackingService },
      { solution: 'security', trackChanges: true }
    );

    await logRuleChange({
      context,
      ruleSO: buildRuleSO(),
      action: RuleChangeTrackingAction.ruleUpdate,
    });

    expect(changeTrackingService.log).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'security' }),
      expect.anything()
    );
  });

  it('swallows registry errors and warns instead of bubbling them', async () => {
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
      logRuleChange({
        context,
        ruleSO: buildRuleSO(),
        action: RuleChangeTrackingAction.ruleCreate,
      })
    ).resolves.toBeUndefined();

    expect(changeTrackingService.log).not.toHaveBeenCalled();
    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Unable to log rule change for action "${RuleChangeTrackingAction.ruleCreate}"`
      )
    );
  });

  it('swallows changeTrackingService.log errors and warns instead of bubbling them', async () => {
    changeTrackingService.log.mockRejectedValueOnce(new Error('boom'));
    const context = buildContext({ changeTrackingService });

    await expect(
      logRuleChange({
        context,
        ruleSO: buildRuleSO(),
        action: RuleChangeTrackingAction.ruleSnooze,
      })
    ).resolves.toBeUndefined();

    expect(context.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Unable to log rule change for action "${RuleChangeTrackingAction.ruleSnooze}"`
      )
    );
  });
});

const buildRuleSO = (overrides: Partial<SavedObject<RawRule>> = {}): SavedObject<RawRule> => ({
  id: 'rule-1',
  type: RULE_SAVED_OBJECT_TYPE,
  attributes: { alertTypeId: '123', name: 'rule one' } as RawRule,
  references: [{ id: 'action-1', name: 'action_0', type: 'action' }],
  ...overrides,
});

const createMockChangeTrackingService = (): jest.Mocked<IScopedChangeTrackingService> => ({
  log: jest.fn().mockResolvedValue(undefined),
  logBulk: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue({ items: [], total: 0 }),
});

const buildContext = (
  overrides: Partial<RulesClientContext> = {},
  ruleType: { solution: string; trackChanges: boolean } = {
    solution: 'stack',
    trackChanges: true,
  }
): RulesClientContext => {
  const ruleTypeRegistry = {
    get: jest.fn().mockReturnValue(ruleType),
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
