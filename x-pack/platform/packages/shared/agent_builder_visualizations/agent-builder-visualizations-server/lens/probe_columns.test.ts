/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { probeColumns } from './probe_columns';

describe('probeColumns', () => {
  it('returns the columns from the injected getter', async () => {
    const getColumns = jest.fn().mockResolvedValue([{ name: 'count', type: 'long' }]);

    await expect(probeColumns('FROM logs | STATS count = COUNT(*)', getColumns)).resolves.toEqual([
      { name: 'count', type: 'long' },
    ]);
    expect(getColumns).toHaveBeenCalledWith('FROM logs | STATS count = COUNT(*)');
  });
});
