/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  executeEsqlQueryRetryingRemoteResources,
  parseRemoteResourceExclusions,
  toRemoteResourceExclusions,
} from './remote_resource_not_supported';

const SAMPLE_REASON =
  'ES|QL queries with remote views are not supported. Matched [kayak-f86d55:$.alert-actions, kayak-f86d55:$.alert-episodes, opentable-b5cb9a:$.alert-actions]. Remove them from the query pattern or exclude them with [kayak-f86d55:-$.alert-actions,kayak-f86d55:-$.alert-episodes,opentable-b5cb9a:-$.alert-actions] if matched by a wildcard.';

describe('toRemoteResourceExclusions', () => {
  it('emits cluster-specific and any-remote exclusions', () => {
    expect(toRemoteResourceExclusions('kayak-f86d55:$.alert-actions')).toEqual([
      'kayak-f86d55:-$.alert-actions',
      '*:-$.alert-actions',
    ]);
  });

  it('emits local and any-remote exclusions for unqualified names', () => {
    expect(toRemoteResourceExclusions('logs-security-summary')).toEqual([
      '-logs-security-summary',
      '*:-logs-security-summary',
    ]);
  });
});

describe('parseRemoteResourceExclusions', () => {
  it('returns empty for unrelated errors', () => {
    expect(parseRemoteResourceExclusions(new Error('cluster_block_exception'))).toEqual([]);
  });

  it('prefers ES metadata view names', () => {
    const error = {
      message: SAMPLE_REASON,
      meta: {
        body: {
          error: {
            type: 'remote_resource_not_supported_exception',
            reason: SAMPLE_REASON,
            'es.esql.view.names': ['kayak-f86d55:$.alert-actions'],
          },
        },
      },
    };

    expect(parseRemoteResourceExclusions(error)).toEqual(
      expect.arrayContaining(['kayak-f86d55:-$.alert-actions', '*:-$.alert-actions'])
    );
  });

  it('parses the exclude-them-with list from the reason', () => {
    const error = {
      message: SAMPLE_REASON,
      meta: {
        body: {
          error: {
            type: 'remote_resource_not_supported_exception',
            reason: SAMPLE_REASON,
          },
        },
      },
    };

    const exclusions = parseRemoteResourceExclusions(error);
    expect(exclusions).toEqual(
      expect.arrayContaining([
        'kayak-f86d55:-$.alert-actions',
        '*:-$.alert-actions',
        'opentable-b5cb9a:-$.alert-actions',
        '*:-$.alert-episodes',
      ])
    );
  });
});

describe('executeEsqlQueryRetryingRemoteResources', () => {
  const emptyResponse: ESQLSearchResponse = { columns: [], values: [] };

  it('mutates indexPatterns and retries after a remote-view error', async () => {
    const logger = loggerMock.create();
    const indexPatterns = ['logs-*'];
    const execute = jest
      .fn()
      .mockRejectedValueOnce({
        message: SAMPLE_REASON,
        meta: {
          body: {
            error: {
              type: 'remote_resource_not_supported_exception',
              reason: SAMPLE_REASON,
            },
          },
        },
      })
      .mockResolvedValueOnce(emptyResponse);

    const result = await executeEsqlQueryRetryingRemoteResources({
      indexPatterns,
      logger,
      execute,
    });

    expect(result).toBe(emptyResponse);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(indexPatterns).toEqual(expect.arrayContaining(['logs-*', '*:-$.alert-actions']));
    expect(execute.mock.calls[1][0]).toBe(indexPatterns);
  });

  it('rethrows errors that are not remote-resource failures', async () => {
    const logger = loggerMock.create();
    const boom = new Error('cluster_block_exception');
    const execute = jest.fn().mockRejectedValue(boom);

    await expect(
      executeEsqlQueryRetryingRemoteResources({
        indexPatterns: ['logs-*'],
        logger,
        execute,
      })
    ).rejects.toBe(boom);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
