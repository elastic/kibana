/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeExperimentalDataStreamFeatures } from './experimental_data_stream_features';

describe('sanitizeExperimentalDataStreamFeatures', () => {
  it('returns undefined when there is nothing stored', () => {
    expect(sanitizeExperimentalDataStreamFeatures(undefined)).toBeUndefined();
  });

  it('keeps the known indexing features untouched', () => {
    const features = [
      {
        data_stream: 'logs-nginx.access',
        features: { synthetic_source: true, tsdb: false, doc_value_only_numeric: true },
      },
    ];

    expect(sanitizeExperimentalDataStreamFeatures(features)).toEqual(features);
  });

  it('drops feature keys Fleet does not know about', () => {
    expect(
      sanitizeExperimentalDataStreamFeatures([
        {
          data_stream: 'logs-nginx.access',
          features: { columnar: true, tsdb: true } as any,
        },
        { data_stream: 'logs-nginx.error', features: { columnar: false } as any },
      ])
    ).toEqual([
      { data_stream: 'logs-nginx.access', features: { tsdb: true } },
      { data_stream: 'logs-nginx.error', features: {} },
    ]);
  });
});
