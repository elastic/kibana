/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasetSampleType, getSampleDataIndexName } from '.';

describe('getSampleDataIndexName', () => {
  it('should generate correct index names', async () => {
    expect(getSampleDataIndexName(DatasetSampleType.elasticsearch)).toBe(
      'kibana_sample_data_elasticsearch_documentation'
    );
  });

  it('should handle uppercase sample types correctly', async () => {
    const sampleType = 'KIBANA' as DatasetSampleType;

    expect(getSampleDataIndexName(sampleType)).toBe('kibana_sample_data_kibana');
  });
});
