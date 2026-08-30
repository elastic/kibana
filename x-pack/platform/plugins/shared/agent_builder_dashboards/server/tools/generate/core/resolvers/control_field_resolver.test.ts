/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { createControlFieldResolver } from './control_field_resolver';

const sampleLogsFields = {
  host: { text: { aggregatable: false, type: 'text' } },
  'host.keyword': { keyword: { aggregatable: true, type: 'keyword' } },
};

describe('createControlFieldResolver', () => {
  it('rewrites a text field using field_caps for that index', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: sampleLogsFields });
    const resolve = createControlFieldResolver({
      esClient: { asCurrentUser: { fieldCaps } } as never,
      logger: loggerMock.create(),
    });

    await expect(
      resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' })
    ).resolves.toEqual({ fieldName: 'host.keyword' });
    expect(fieldCaps).toHaveBeenCalledWith({
      index: 'kibana_sample_data_logs',
      fields: '*',
      include_unmapped: false,
    });
  });

  it('rejects an unknown field after looking up the mapping', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: sampleLogsFields });
    const resolve = createControlFieldResolver({
      esClient: { asCurrentUser: { fieldCaps } } as never,
      logger: loggerMock.create(),
    });

    await expect(
      resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' })
    ).resolves.toEqual({
      error: 'Field "method" is not an aggregatable field on this index.',
    });
  });

  it('reuses one field_caps lookup per index', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({ fields: sampleLogsFields });
    const resolve = createControlFieldResolver({
      esClient: { asCurrentUser: { fieldCaps } } as never,
      logger: loggerMock.create(),
    });

    await resolve({ fieldName: 'host', index: 'kibana_sample_data_logs' });
    await resolve({ fieldName: 'method', index: 'kibana_sample_data_logs' });

    expect(fieldCaps).toHaveBeenCalledTimes(1);
  });

  it('fails the field when field_caps cannot be loaded', async () => {
    const fieldCaps = jest.fn().mockRejectedValue(new Error('index_not_found_exception'));
    const resolve = createControlFieldResolver({
      esClient: { asCurrentUser: { fieldCaps } } as never,
      logger: loggerMock.create(),
    });

    await expect(resolve({ fieldName: 'host', index: 'missing-*' })).resolves.toEqual({
      error: 'Could not verify field "host" on index "missing-*".',
    });
  });
});
