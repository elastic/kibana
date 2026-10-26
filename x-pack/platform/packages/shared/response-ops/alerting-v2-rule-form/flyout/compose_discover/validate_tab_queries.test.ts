/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateQuery } from '@kbn/esql-language';
import { validateTabQueries } from './validate_tab_queries';

jest.mock('@kbn/esql-language', () => ({
  validateQuery: jest.fn(),
}));

const mockValidateQuery = validateQuery as jest.Mock;
const callbacks = {};

const noErrors = { errors: [], warnings: [] };

describe('validateTabQueries', () => {
  beforeEach(() => {
    mockValidateQuery.mockReset();
  });

  it('returns an entry with messages for a tab whose query fails validation', async () => {
    mockValidateQuery.mockImplementation(async (query: string) =>
      query.includes('garbage') ? { errors: [{ text: 'bad query' }], warnings: [] } : noErrors
    );

    const result = await validateTabQueries(
      { base: 'FROM logs-*', alert: 'FROM logs-* | garbage' },
      callbacks
    );

    expect(result).toEqual([{ tab: 'alert', messages: ['bad query'] }]);
  });

  it('returns an empty array when every non-empty tab validates cleanly', async () => {
    mockValidateQuery.mockResolvedValue(noErrors);

    const result = await validateTabQueries(
      { base: 'FROM logs-*', alert: 'FROM logs-* | WHERE cpu > 70' },
      callbacks
    );

    expect(result).toEqual([]);
  });

  it('skips tabs with empty query text', async () => {
    mockValidateQuery.mockResolvedValue(noErrors);

    await validateTabQueries({ base: 'FROM logs-*', recovery: '' }, callbacks);

    expect(mockValidateQuery).toHaveBeenCalledTimes(1);
    expect(mockValidateQuery).toHaveBeenCalledWith('FROM logs-*', callbacks);
  });

  it('reads the message from either ESQLMessage.text or EditorError.message', async () => {
    mockValidateQuery.mockImplementation(async (query: string) =>
      query.includes('base')
        ? { errors: [{ text: 'esql message' }], warnings: [] }
        : { errors: [{ message: 'editor message' }], warnings: [] }
    );

    const result = await validateTabQueries(
      { base: 'FROM base garbage', alert: 'FROM alert garbage' },
      callbacks
    );

    expect(result).toEqual(
      expect.arrayContaining([
        { tab: 'base', messages: ['esql message'] },
        { tab: 'alert', messages: ['editor message'] },
      ])
    );
  });

  it('reports a validation exception for one tab as an error, without failing the batch', async () => {
    mockValidateQuery.mockImplementation(async (query: string) => {
      if (query.includes('boom')) throw new Error('boom');
      return { errors: [{ text: 'bad query' }], warnings: [] };
    });

    const result = await validateTabQueries(
      { base: 'FROM logs-* boom', alert: 'FROM logs-* garbage' },
      callbacks
    );

    expect(result).toEqual(
      expect.arrayContaining([
        { tab: 'base', messages: ['Could not validate this query. Try again.'] },
        { tab: 'alert', messages: ['bad query'] },
      ])
    );
  });
});
