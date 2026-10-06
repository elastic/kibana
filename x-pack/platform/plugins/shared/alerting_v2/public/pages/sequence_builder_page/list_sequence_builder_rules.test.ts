/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_PER_PAGE } from '@kbn/alerting-v2-schemas';
import {
  SEQUENCE_BUILDER_MAX_RULES,
  listSequenceBuilderRules,
} from './list_sequence_builder_rules';

interface RuleStub {
  id: string;
}

const pageOf = (start: number, count: number): RuleStub[] =>
  Array.from({ length: count }, (_, index) => ({ id: `rule-${start + index}` }));

describe('listSequenceBuilderRules', () => {
  it('requests a single page at the API maximum when all rules fit', async () => {
    const listRules = jest.fn().mockResolvedValue({
      items: pageOf(0, 3),
      total: 3,
    });

    await expect(listSequenceBuilderRules(listRules)).resolves.toEqual({
      items: pageOf(0, 3),
      total: 3,
    });
    expect(listRules).toHaveBeenCalledTimes(1);
    expect(listRules).toHaveBeenCalledWith({
      page: 1,
      per_page: MAX_PER_PAGE,
      filter: undefined,
      search: undefined,
      sort_field: 'name',
      sort_order: 'asc',
    });
  });

  it('loads a second page when the total exceeds the page size', async () => {
    const listRules = jest
      .fn()
      .mockResolvedValueOnce({ items: pageOf(0, MAX_PER_PAGE), total: MAX_PER_PAGE + 5 })
      .mockResolvedValueOnce({ items: pageOf(MAX_PER_PAGE, 5), total: MAX_PER_PAGE + 5 });

    await expect(listSequenceBuilderRules(listRules)).resolves.toEqual({
      items: pageOf(0, MAX_PER_PAGE + 5),
      total: MAX_PER_PAGE + 5,
    });
    expect(listRules).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ page: 2, per_page: MAX_PER_PAGE })
    );
  });

  it('stops at the sequence builder cap instead of requesting per_page above the API maximum', async () => {
    const listRules = jest.fn().mockImplementation(async ({ page }: { page: number }) => ({
      items: pageOf((page - 1) * MAX_PER_PAGE, MAX_PER_PAGE),
      total: SEQUENCE_BUILDER_MAX_RULES + MAX_PER_PAGE,
    }));

    const rules = await listSequenceBuilderRules(listRules);

    expect(rules.items).toHaveLength(SEQUENCE_BUILDER_MAX_RULES);
    expect(rules.total).toBeGreaterThan(rules.items.length);
    expect(listRules).toHaveBeenCalledTimes(SEQUENCE_BUILDER_MAX_RULES / MAX_PER_PAGE);
    expect(listRules.mock.calls.map(([params]) => params.per_page)).toEqual([
      MAX_PER_PAGE,
      MAX_PER_PAGE,
    ]);
  });
});
