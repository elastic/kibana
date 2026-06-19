/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  createMockArrowReader,
  createMockEsClient,
  mockHelpersEsqlToArrowReader,
} from '../../test_utils';
import {
  appendEsqlLimitZero,
  formatEsqlArrowExecutionErrorMessage,
  validateEsqlQueryExecutable,
} from './validate_esql_query_executable';

describe('validateEsqlQueryExecutable', () => {
  let mockEsClient: DeeplyMockedApi<ElasticsearchClient>;

  beforeEach(() => {
    mockEsClient = createMockEsClient();
  });

  describe('appendEsqlLimitZero', () => {
    it('appends LIMIT 0 to the query', () => {
      expect(appendEsqlLimitZero('FROM logs-* | STATS COUNT(*)')).toBe(
        'FROM logs-* | STATS COUNT(*) | LIMIT 0'
      );
    });

    it('trims trailing whitespace before appending LIMIT 0', () => {
      expect(appendEsqlLimitZero('FROM logs-*   ')).toBe('FROM logs-* | LIMIT 0');
    });
  });

  describe('formatEsqlArrowExecutionErrorMessage', () => {
    it('explains that Arrow format is required for rule evaluation', () => {
      expect(
        formatEsqlArrowExecutionErrorMessage(
          'illegal_argument_exception: ES|QL type [flattened] is not supported by the Arrow format'
        )
      ).toBe(
        'ES|QL query cannot be executed using the Arrow format required for rule evaluation: illegal_argument_exception: ES|QL type [flattened] is not supported by the Arrow format'
      );
    });
  });

  it('executes the query through the Arrow helper with LIMIT 0', async () => {
    const reader = createMockArrowReader([]);
    const toArrowReader = jest.fn().mockResolvedValue(reader);
    mockHelpersEsqlToArrowReader(mockEsClient, toArrowReader);

    await validateEsqlQueryExecutable(mockEsClient, 'FROM logs-* | STATS COUNT(*)');

    expect(mockEsClient.helpers.esql).toHaveBeenCalledWith(
      {
        query: 'FROM logs-* | STATS COUNT(*) | LIMIT 0',
        drop_null_columns: false,
      },
      {}
    );
    expect(toArrowReader).toHaveBeenCalledTimes(1);
    expect(reader.cancel).not.toHaveBeenCalled();
  });

  it('propagates Arrow helper errors such as unsupported ES|QL types', async () => {
    mockHelpersEsqlToArrowReader(
      mockEsClient,
      jest
        .fn()
        .mockRejectedValue(
          new Error(
            'illegal_argument_exception: ES|QL type [flattened] is not supported by the Arrow format'
          )
        )
    );

    await expect(validateEsqlQueryExecutable(mockEsClient, 'FROM .rule-events')).rejects.toThrow(
      'flattened'
    );
  });
});
