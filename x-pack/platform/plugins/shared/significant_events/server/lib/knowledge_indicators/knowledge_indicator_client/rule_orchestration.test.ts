/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_NAME_LENGTH } from '@kbn/alerting-v2-schemas';
import type { QueryLink } from '@kbn/significant-events-schema';
import { BulkCreateRulesError, type IRulesManagementClient } from './rules/rules_management_client';
import {
  InstallQueriesError,
  installQueries,
  toRuleDefinition,
  uninstallQueries,
  uninstallRuleIds,
} from './rule_orchestration';
import {
  METRIC_SERIES_EVERY,
  METRIC_SERIES_RULE_NAME_SUFFIX,
} from '../../significant_events/rules/metric_series_contract';

const makeQueryLink = (severityScore?: number, title = 'Error logs'): QueryLink => ({
  query: {
    id: 'query-1',
    type: 'match',
    title,
    description: 'Matches error logs',
    esql: { query: 'FROM logs-* | WHERE level == "error"' },
    severity_score: severityScore,
  },
  stream_name: 'logs.test',
  rule_backed: true,
  rule_id: 'rule-1',
});

const makeQueryLinks = (count: number): QueryLink[] =>
  Array.from({ length: count }, (_, index) => {
    const queryLink = makeQueryLink(80, `Query ${index}`);
    return {
      ...queryLink,
      query: {
        ...queryLink.query,
        id: `query-${index}`,
      },
      rule_id: `rule-${index}`,
    };
  });

const makeRulesClient = (): jest.Mocked<IRulesManagementClient> => ({
  createRule: jest.fn().mockResolvedValue(undefined),
  bulkCreateRules: jest
    .fn()
    .mockImplementation((rules) =>
      Promise.resolve({ createdIds: rules.map(({ id }: { id: string }) => id) })
    ),
  updateRule: jest.fn().mockResolvedValue(undefined),
  bulkDeleteRules: jest.fn().mockResolvedValue(undefined),
  findExistingRuleIds: jest.fn().mockResolvedValue([]),
  findOwnedRuleIds: jest.fn().mockResolvedValue([]),
  findStreamNamesWithOwnedRules: jest.fn().mockResolvedValue([]),
});

describe('toRuleDefinition', () => {
  it('maps a query link to the v2-native Significant Events rule definition', () => {
    // Severity no longer changes execution cadence — critical vs default only
    // affects analysis profiles, so a high score still uses METRIC_SERIES_EVERY.
    expect(toRuleDefinition(makeQueryLink(85))).toEqual({
      name: `Error logs${METRIC_SERIES_RULE_NAME_SUFFIX}`,
      streamName: 'logs.test',
      timestampField: '@timestamp',
      esqlQuery: 'FROM logs-* | WHERE level == "error"',
      schedule: { interval: METRIC_SERIES_EVERY },
    });
  });

  it('trims an overlong title so the name fits the Alerting v2 cap, suffix intact', () => {
    const { name } = toRuleDefinition(makeQueryLink(85, 'A'.repeat(MAX_NAME_LENGTH + 50)));

    expect(name).toHaveLength(MAX_NAME_LENGTH);
    expect(name.endsWith(METRIC_SERIES_RULE_NAME_SUFFIX)).toBe(true);
  });
});

describe('installQueries', () => {
  it('sends multiple creates together with their mapped definitions', async () => {
    const client = makeRulesClient();

    const result = await installQueries(client, makeQueryLinks(3), []);

    expect(result).toEqual({
      createdIds: ['rule-0', 'rule-1', 'rule-2'],
      conflictIds: [],
    });
    expect(client.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(client.bulkCreateRules).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'rule-0',
        definition: expect.objectContaining({ name: `Query 0${METRIC_SERIES_RULE_NAME_SUFFIX}` }),
      }),
      expect.objectContaining({ id: 'rule-1' }),
      expect.objectContaining({ id: 'rule-2' }),
    ]);
  });

  it.each([
    [100, [100]],
    [101, [51, 50]],
    [201, [100, 51, 50]],
  ])('chunks %i creates without a singleton tail', async (count, expectedChunkSizes) => {
    const client = makeRulesClient();

    await installQueries(client, makeQueryLinks(count), []);

    const chunks = client.bulkCreateRules.mock.calls.map(([rules]) => rules);
    expect(chunks.map((chunk) => chunk.length)).toEqual(expectedChunkSizes);
    expect(chunks.flat().map(({ id }) => id)).toEqual(
      Array.from({ length: count }, (_, index) => `rule-${index}`)
    );
  });

  it('skips bulk create and limits concurrent updates', async () => {
    const client = makeRulesClient();
    let activeUpdates = 0;
    let maxActiveUpdates = 0;
    client.updateRule.mockImplementation(async () => {
      activeUpdates += 1;
      maxActiveUpdates = Math.max(maxActiveUpdates, activeUpdates);
      await Promise.resolve();
      activeUpdates -= 1;
    });

    await installQueries(client, [], makeQueryLinks(11));

    expect(client.bulkCreateRules).not.toHaveBeenCalled();
    expect(client.updateRule).toHaveBeenCalledTimes(11);
    expect(maxActiveUpdates).toBe(10);
  });

  it('finishes creates before starting updates', async () => {
    const client = makeRulesClient();
    let finishCreate = () => {};
    client.bulkCreateRules.mockImplementation(
      (rules: Array<{ id: string }>) =>
        new Promise<{ createdIds: string[] }>((resolve) => {
          finishCreate = () => resolve({ createdIds: rules.map(({ id }) => id) });
        })
    );

    const installation = installQueries(client, makeQueryLinks(2), makeQueryLinks(1));
    await Promise.resolve();

    expect(client.bulkCreateRules).toHaveBeenCalledTimes(1);
    expect(client.updateRule).not.toHaveBeenCalled();

    finishCreate();
    await installation;
    expect(client.updateRule).toHaveBeenCalledTimes(1);
  });

  it('propagates a create failure as InstallQueriesError without starting updates', async () => {
    const client = makeRulesClient();
    const createError = new Error('bulk create failed');
    client.bulkCreateRules.mockRejectedValue(createError);

    const thrown = await installQueries(client, makeQueryLinks(2), makeQueryLinks(1)).catch(
      (error) => error
    );
    expect(thrown).toBeInstanceOf(InstallQueriesError);
    expect(thrown.cause).toBe(createError);
    expect(thrown.createdIds).toEqual([]);
    expect(thrown.conflictIds).toEqual([]);
    expect(thrown.failedIds).toEqual(['rule-0', 'rule-1']);
    expect(client.updateRule).not.toHaveBeenCalled();
  });

  it('preserves same-batch partial results when bulk create fails', async () => {
    const client = makeRulesClient();
    const createError = new Error('one item failed');
    client.bulkCreateRules.mockRejectedValue(
      new BulkCreateRulesError(createError, ['rule-0'], ['rule-1'], ['rule-2'])
    );

    const thrown = await installQueries(client, makeQueryLinks(3), []).catch((error) => error);

    expect(thrown).toBeInstanceOf(InstallQueriesError);
    expect(thrown).toMatchObject({
      cause: createError,
      createdIds: ['rule-0'],
      conflictIds: ['rule-1'],
      failedIds: ['rule-2'],
    });
  });

  it('preserves created ids when an update fails', async () => {
    const client = makeRulesClient();
    const updateError = new Error('update failed');
    client.updateRule.mockRejectedValueOnce(updateError);

    const thrown = await installQueries(client, makeQueryLinks(2), makeQueryLinks(2)).catch(
      (error) => error
    );

    expect(thrown).toBeInstanceOf(InstallQueriesError);
    expect(thrown).toMatchObject({
      cause: updateError,
      createdIds: ['rule-0', 'rule-1'],
      conflictIds: [],
      failedIds: ['rule-0'],
    });
  });

  it('reports non-created rules as conflicts after a successful bulk call', async () => {
    const client = makeRulesClient();
    client.bulkCreateRules.mockResolvedValue({ createdIds: ['rule-0'] });

    await expect(installQueries(client, makeQueryLinks(2), [])).resolves.toEqual({
      createdIds: ['rule-0'],
      conflictIds: ['rule-1'],
    });
  });
});

describe('uninstallQueries', () => {
  it('chunks deletes at the bulk API limit', async () => {
    const client = makeRulesClient();

    await uninstallQueries(client, makeQueryLinks(201));

    const chunks = client.bulkDeleteRules.mock.calls.map(([ids]) => ids);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 51, 50]);
    expect(chunks.flat()).toEqual(Array.from({ length: 201 }, (_, index) => `rule-${index}`));
  });

  it('chunks direct rule-id compensation at the bulk API limit', async () => {
    const client = makeRulesClient();
    const ruleIds = Array.from({ length: 201 }, (_, index) => `rule-${index}`);

    await uninstallRuleIds(client, ruleIds);

    const chunks = client.bulkDeleteRules.mock.calls.map(([ids]) => ids);
    expect(chunks.map((chunk) => chunk.length)).toEqual([100, 51, 50]);
    expect(chunks.flat()).toEqual(ruleIds);
  });
});
