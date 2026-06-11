/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { deprovisionRuleOnRules } from './deprovisioner';
import { computeRuleOnRuleId } from './compute_rule_on_rule_id';
import { TAG_MONITORED_PREFIX } from './constants';

function makeRulesClient({
  taggedRuleIds = [] as string[],
  deleteErrors = [] as Array<{ id: string; error: { statusCode: number } }>,
} = {}) {
  return {
    findRules: jest.fn().mockResolvedValue({
      items: taggedRuleIds.map((id) => ({
        id,
        metadata: { name: `child-${id}`, tags: [`${TAG_MONITORED_PREFIX}base-rule`] },
      })),
      total: taggedRuleIds.length,
      page: 1,
      perPage: 100,
    }),
    bulkDeleteRules: jest.fn().mockResolvedValue({ errors: deleteErrors }),
  } as unknown as RulesClientApi;
}

describe('deprovisionRuleOnRules', () => {
  const monitoredRuleId = 'base-rule';

  it('deletes the default count-based child id', async () => {
    const childId = computeRuleOnRuleId(monitoredRuleId);
    const rulesClient = makeRulesClient();

    const result = await deprovisionRuleOnRules({ monitoredRuleId, rulesClient });

    expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith({ ids: [childId] });
    expect(result.deletedRuleIds).toEqual([childId]);
    expect(result.notFoundRuleIds).toEqual([]);
  });

  it('includes tag-discovered children and knownChildRuleIds', async () => {
    const defaultChild = computeRuleOnRuleId(monitoredRuleId);
    const metricChild = computeRuleOnRuleId(monitoredRuleId, 'cpu');
    const rulesClient = makeRulesClient({ taggedRuleIds: [metricChild] });

    await deprovisionRuleOnRules({
      monitoredRuleId,
      rulesClient,
      knownChildRuleIds: [defaultChild],
    });

    expect(rulesClient.bulkDeleteRules).toHaveBeenCalledWith({
      ids: expect.arrayContaining([defaultChild, metricChild]),
    });
  });

  it('reports not-found ids from bulk delete errors', async () => {
    const childId = computeRuleOnRuleId(monitoredRuleId);
    const rulesClient = makeRulesClient({
      deleteErrors: [{ id: childId, error: { statusCode: 404 } }],
    });

    const result = await deprovisionRuleOnRules({ monitoredRuleId, rulesClient });

    expect(result.notFoundRuleIds).toEqual([childId]);
    expect(result.deletedRuleIds).toEqual([]);
  });
});
