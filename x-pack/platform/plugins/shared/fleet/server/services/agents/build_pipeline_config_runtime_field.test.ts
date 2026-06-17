/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PIPELINE_CONFIG_RUNTIME_FIELD } from './build_pipeline_config_runtime_field';

describe('PIPELINE_CONFIG_RUNTIME_FIELD', () => {
  it('defines a pipeline_config keyword runtime field', () => {
    expect(PIPELINE_CONFIG_RUNTIME_FIELD).toHaveProperty('pipeline_config');
    expect(PIPELINE_CONFIG_RUNTIME_FIELD.pipeline_config).toMatchObject({
      type: 'keyword',
      script: { lang: 'painless' },
    });
  });

  it('script source covers all required sections', () => {
    const source = (PIPELINE_CONFIG_RUNTIME_FIELD.pipeline_config as any).script.source as string;
    expect(source).toContain('receivers');
    expect(source).toContain('processors');
    expect(source).toContain('exporters');
    expect(source).toContain('connectors');
    expect(source).toContain('service.pipelines');
    expect(source).toContain('service.extensions');
    expect(source).toContain('emit');
  });
});
