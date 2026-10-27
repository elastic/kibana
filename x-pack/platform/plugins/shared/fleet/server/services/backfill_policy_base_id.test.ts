/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';

import {
  AGENT_POLICY_INDEX,
  AGENT_POLICY_SENTINEL_VERSION,
  AGENT_POLICY_VERSION_SEPARATOR,
  AGENTS_INDEX,
} from '../../common/constants';
import { POLICY_ID_FIXTURES } from '../../common/services/version_specific_policy_id_fixtures';

import {
  BACKFILL_SCRIPT,
  backfillIndex,
  backfillPolicyBaseId,
  type BackfillTarget,
} from './backfill_policy_base_id';

/**
 * Line by line port of `BACKFILL_SCRIPT`: Jest does not allow evaluating the Painless source, and
 * the script needs Elasticsearch to run. The inline snapshot below fails when the script changes, so
 * the port has to be updated with it, and the port is checked against the shared policy id fixtures.
 */
const runBackfillScriptPort = (source: Record<string, any>) => {
  const params = {
    separator: AGENT_POLICY_VERSION_SEPARATOR,
    sentinelVersion: AGENT_POLICY_SENTINEL_VERSION,
  };
  const ctx: { _source: Record<string, any>; op?: string } = { _source: { ...source } };
  if (
    ctx._source.policy_id == null ||
    (Object.hasOwn(ctx._source, 'policy_base_id') && ctx._source.policy_base_id != null)
  ) {
    ctx.op = 'noop';
    return ctx;
  }
  const pid: string = ctx._source.policy_id;
  const sepIdx = pid.lastIndexOf(params.separator);
  if (sepIdx >= 0) {
    const suffix = pid.substring(sepIdx + 1);
    const dotIdx = suffix.indexOf('.');
    let isVersion = dotIdx > 0 && suffix.length > dotIdx + 1;
    if (suffix === params.sentinelVersion) {
      isVersion = true;
    } else if (isVersion) {
      for (let i = 0; i < suffix.length; i++) {
        if (i !== dotIdx && !/^[0-9]$/.test(suffix.charAt(i))) {
          isVersion = false;
          break;
        }
      }
    }
    ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
  } else {
    ctx._source.policy_base_id = pid;
  }
  return ctx;
};

describe('BACKFILL_SCRIPT', () => {
  it('has not changed, update runBackfillScriptPort together with it', () => {
    expect(BACKFILL_SCRIPT).toMatchInlineSnapshot(`
      "if (ctx._source.policy_id == null ||
            (ctx._source.containsKey('policy_base_id') && ctx._source.policy_base_id != null)) {
          ctx.op = 'noop';
          return;
        }
        String pid = ctx._source.policy_id;
        int sepIdx = pid.lastIndexOf(params.separator);
        if (sepIdx >= 0) {
          String suffix = pid.substring(sepIdx + 1);
          int dotIdx = suffix.indexOf('.');
          boolean isVersion = dotIdx > 0 && suffix.length() > dotIdx + 1;
          if (suffix == params.sentinelVersion) {
            isVersion = true;
          } else if (isVersion) {
            for (int i = 0; i < suffix.length(); i++) {
              if (i != dotIdx && !Character.isDigit(suffix.charAt(i))) { isVersion = false; break; }
            }
          }
          ctx._source.policy_base_id = isVersion ? pid.substring(0, sepIdx) : pid;
        } else {
          ctx._source.policy_base_id = pid;
        }"
    `);
  });

  it.each(POLICY_ID_FIXTURES)('sets policy_base_id for $policyId', ({ policyId, baseId }) => {
    expect(runBackfillScriptPort({ policy_id: policyId })._source.policy_base_id).toBe(baseId);
  });

  it('does not overwrite an existing policy_base_id', () => {
    const ctx = runBackfillScriptPort({ policy_id: 'policy1#9.4', policy_base_id: 'other' });

    expect(ctx.op).toBe('noop');
    expect(ctx._source.policy_base_id).toBe('other');
  });

  it('ignores documents without policy_id', () => {
    expect(runBackfillScriptPort({}).op).toBe('noop');
  });
});

describe('backfillIndex', () => {
  const target: BackfillTarget = {
    index: AGENT_POLICY_INDEX,
    label: 'fleet-policies',
    scrollSize: 10,
    maxDocs: 50,
  };
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggingSystemMock.createLogger();
  });

  it('only counts the documents when there is nothing to backfill', async () => {
    esClient.count.mockResolvedValue({ count: 0 } as any);

    const result = await backfillIndex(esClient, target, { logger });

    expect(result).toEqual({ label: 'fleet-policies', status: 'completed', updated: 0 });
    expect(esClient.updateByQuery).not.toHaveBeenCalled();
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('updates the documents in bounded batches until a batch is not full', async () => {
    esClient.count.mockResolvedValue({ count: 70 } as any);
    esClient.updateByQuery
      .mockResolvedValueOnce({ total: 50, updated: 50 } as any)
      .mockResolvedValueOnce({ total: 20, updated: 20 } as any);

    const result = await backfillIndex(esClient, target, { logger });

    expect(result).toEqual({ label: 'fleet-policies', status: 'completed', updated: 70 });
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(2);
    expect(esClient.updateByQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        index: AGENT_POLICY_INDEX,
        conflicts: 'proceed',
        max_docs: 50,
        scroll_size: 10,
        refresh: true,
        query: {
          bool: {
            must: [{ exists: { field: 'policy_id' } }],
            must_not: [{ exists: { field: 'policy_base_id' } }],
          },
        },
      })
    );
    expect(logger.info).toHaveBeenCalledWith(
      'Backfilled policy_base_id on 70 fleet-policies documents: completed'
    );
  });

  it('stops at the time budget and reports the remaining documents', async () => {
    esClient.count.mockResolvedValueOnce({ count: 120 } as any).mockResolvedValueOnce({
      count: 70,
    } as any);
    esClient.updateByQuery.mockResolvedValue({ total: 50, updated: 50 } as any);
    const now = jest.spyOn(Date, 'now');
    // deadline is 0 + 1000, the second batch starts at 2000
    now.mockReturnValueOnce(0).mockReturnValueOnce(500).mockReturnValue(2000);

    const result = await backfillIndex(esClient, target, { logger, timeBudgetMs: 1000 });
    now.mockRestore();

    expect(result).toEqual({ label: 'fleet-policies', status: 'partial', updated: 50 });
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Backfilled policy_base_id on 50 fleet-policies documents: partial, 70 remaining for the next Fleet setup'
    );
  });

  it('stops when the signal is aborted', async () => {
    esClient.count.mockResolvedValue({ count: 120 } as any);
    const abortController = new AbortController();
    esClient.updateByQuery.mockImplementation(async () => {
      abortController.abort();
      return { total: 50, updated: 50 } as any;
    });

    const result = await backfillIndex(esClient, target, {
      logger,
      signal: abortController.signal,
    });

    expect(result.status).toBe('partial');
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
  });

  it('stops when a full batch updates nothing', async () => {
    esClient.count.mockResolvedValue({ count: 50 } as any);
    esClient.updateByQuery.mockResolvedValue({ total: 50, updated: 0, noops: 50 } as any);

    const result = await backfillIndex(esClient, target, { logger });

    expect(result).toEqual({ label: 'fleet-policies', status: 'partial', updated: 0 });
    expect(esClient.updateByQuery).toHaveBeenCalledTimes(1);
  });

  it('reports a failed batch with the documents updated before it, without throwing', async () => {
    esClient.count.mockResolvedValue({ count: 120 } as any);
    esClient.updateByQuery
      .mockResolvedValueOnce({ total: 50, updated: 50 } as any)
      .mockRejectedValueOnce(new Error('circuit_breaking_exception'));

    const result = await backfillIndex(esClient, target, { logger });

    expect(result).toEqual({ label: 'fleet-policies', status: 'failed', updated: 50 });
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to backfill policy_base_id on fleet-policies after updating 50 documents: circuit_breaking_exception'
    );
  });
});

describe('backfillPolicyBaseId', () => {
  it('backfills the indices one after the other with their batch sizes', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    esClient.count.mockResolvedValue({ count: 1 } as any);
    let running = 0;
    esClient.updateByQuery.mockImplementation(async () => {
      running++;
      expect(running).toBe(1);
      await new Promise((resolve) => setImmediate(resolve));
      running--;
      return { total: 1, updated: 1 } as any;
    });

    const results = await backfillPolicyBaseId(esClient, { logger });

    expect(results.map(({ label, status }) => ({ label, status }))).toEqual([
      { label: 'fleet-agents', status: 'completed' },
      { label: 'fleet-policies', status: 'completed' },
    ]);
    expect(esClient.updateByQuery.mock.calls.map(([params]) => params)).toEqual([
      expect.objectContaining({ index: AGENTS_INDEX, scroll_size: 500, max_docs: 5000 }),
      expect.objectContaining({ index: AGENT_POLICY_INDEX, scroll_size: 10, max_docs: 50 }),
    ]);
  });

  it('continues with the next index when one fails', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    esClient.count.mockResolvedValue({ count: 1 } as any);
    esClient.updateByQuery
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ total: 1, updated: 1 } as any);

    const results = await backfillPolicyBaseId(esClient, { logger });

    expect(results.map(({ status }) => status)).toEqual(['failed', 'completed']);
  });
});
