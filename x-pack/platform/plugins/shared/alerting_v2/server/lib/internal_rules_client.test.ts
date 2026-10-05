/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_BULK_ITEMS } from '@kbn/alerting-v2-schemas';
import { asSpaceId, type SpaceId } from '@kbn/core-spaces-common';
import { ALERTING_ERROR_CODES } from './errors/error_codes';
import { createInternalRulesClient } from './internal_rules_client';
import type { BulkResponse } from './rules_client';
import type { RulesFindAllResultItem } from './services/rules_saved_object_service/rules_saved_object_service';
import { createRuleSoAttributes } from './test_utils';

const foundRule = (id: string, namespaces?: string[]): RulesFindAllResultItem => ({
  id,
  namespaces,
  attributes: createRuleSoAttributes(),
});

const setup = (
  found: RulesFindAllResultItem[],
  spaceErrors: Partial<Record<SpaceId, BulkResponse['errors']>> = {},
  throwingSpaces: SpaceId[] = []
) => {
  const findByIds = jest.fn(async (_ids: string[]) => found);
  const bulkDisableRulesBySpace = new Map<SpaceId, jest.Mock>();
  const getRulesClientInSpace = jest.fn((spaceId: SpaceId) => {
    const errors = spaceErrors[spaceId] ?? [];
    const bulkDisableRules = jest.fn(async ({ ids }: { ids: string[] }): Promise<BulkResponse> => {
      if (throwingSpaces.includes(spaceId)) {
        throw new Error('boom');
      }
      return { affected_count: ids.length - errors.length, errors };
    });
    bulkDisableRulesBySpace.set(spaceId, bulkDisableRules);
    return { bulkDisableRules };
  });
  const client = createInternalRulesClient({
    rulesSavedObjectService: { findByIds },
    getRulesClientInSpace,
  });
  return { client, findByIds, getRulesClientInSpace, bulkDisableRulesBySpace };
};

describe('createInternalRulesClient', () => {
  it('disables each rule in the space it lives in', async () => {
    const { client, findByIds, getRulesClientInSpace, bulkDisableRulesBySpace } = setup([
      foundRule('rule-1', ['default']),
      foundRule('rule-2', ['space-a']),
      foundRule('rule-3', ['default']),
    ]);

    const result = await client.bulkDisableRules({ ids: ['rule-1', 'rule-2', 'rule-3', 'rule-1'] });

    expect(findByIds).toHaveBeenCalledWith(['rule-1', 'rule-2', 'rule-3'], {
      fields: expect.any(Array),
    });
    expect(getRulesClientInSpace).toHaveBeenCalledTimes(2);
    expect(bulkDisableRulesBySpace.get(asSpaceId('default'))).toHaveBeenCalledWith({
      ids: ['rule-1', 'rule-3'],
    });
    expect(bulkDisableRulesBySpace.get(asSpaceId('space-a'))).toHaveBeenCalledWith({
      ids: ['rule-2'],
    });
    expect(result).toEqual({ affected_count: 3, errors: [] });
  });

  it('reports ids found in no space as RULE_NOT_FOUND without creating a space client', async () => {
    const { client, getRulesClientInSpace } = setup([]);

    const result = await client.bulkDisableRules({ ids: ['missing'] });

    expect(getRulesClientInSpace).not.toHaveBeenCalled();
    expect(result).toEqual({
      affected_count: 0,
      errors: [
        {
          id: 'missing',
          error: expect.objectContaining({ code: ALERTING_ERROR_CODES.RULE_NOT_FOUND }),
        },
      ],
    });
  });

  it('returns the errors reported by each space client', async () => {
    const conflict = {
      id: 'rule-2',
      error: { code: ALERTING_ERROR_CODES.RULE_VERSION_CONFLICT, message: 'conflict' },
    };
    const { client } = setup([foundRule('rule-1', ['default']), foundRule('rule-2', ['space-a'])], {
      [asSpaceId('space-a')]: [conflict],
    });

    const result = await client.bulkDisableRules({ ids: ['rule-1', 'rule-2'] });

    expect(result.errors).toEqual([conflict]);
  });

  it('reports the rules of a space whose client throws as errors without stopping the other spaces', async () => {
    const { client, bulkDisableRulesBySpace } = setup(
      [foundRule('rule-1', ['default']), foundRule('rule-2', ['space-a'])],
      {},
      [asSpaceId('default')]
    );

    const result = await client.bulkDisableRules({ ids: ['rule-1', 'rule-2'] });

    expect(bulkDisableRulesBySpace.get(asSpaceId('space-a'))).toHaveBeenCalledWith({
      ids: ['rule-2'],
    });
    expect(result).toEqual({
      affected_count: 1,
      errors: [{ id: 'rule-1', error: expect.objectContaining({ message: 'boom' }) }],
    });
  });

  it('rejects more unique ids than MAX_BULK_ITEMS without reading any rule', async () => {
    const { client, findByIds } = setup([]);
    const ids = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, i) => `rule-${i}`);

    await expect(client.bulkDisableRules({ ids })).rejects.toMatchObject({
      output: { statusCode: 400 },
    });
    expect(findByIds).not.toHaveBeenCalled();
  });

  it('reports ids the HTTP API would reject as errors without looking them up', async () => {
    const invalidId = 'x" OR alerting_rule.id: * OR alerting_rule.id: "x';
    const { client, findByIds, bulkDisableRulesBySpace } = setup([
      foundRule('rule-1', ['default']),
    ]);

    const result = await client.bulkDisableRules({ ids: ['rule-1', invalidId] });

    expect(findByIds).toHaveBeenCalledWith(['rule-1'], { fields: expect.any(Array) });
    expect(bulkDisableRulesBySpace.get(asSpaceId('default'))).toHaveBeenCalledWith({
      ids: ['rule-1'],
    });
    expect(result).toEqual({
      affected_count: 1,
      errors: [
        {
          id: invalidId,
          error: expect.objectContaining({
            message: `Rule id "${invalidId}" is not a valid rule id`,
          }),
        },
      ],
    });
  });

  it('does not count duplicate ids towards MAX_BULK_ITEMS', async () => {
    const { client, findByIds } = setup([]);
    const uniqueIds = Array.from({ length: MAX_BULK_ITEMS }, (_, i) => `rule-${i}`);

    await client.bulkDisableRules({ ids: [...uniqueIds, 'rule-0'] });

    expect(findByIds.mock.calls.flatMap(([batch]) => batch)).toEqual(uniqueIds);
  });
});
