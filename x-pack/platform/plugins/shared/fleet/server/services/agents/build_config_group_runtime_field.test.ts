/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CONFIG_GROUP_RUNTIME_FIELD } from './build_config_group_runtime_field';

describe('CONFIG_GROUP_RUNTIME_FIELD', () => {
  it('defines a config_group keyword runtime field', () => {
    expect(CONFIG_GROUP_RUNTIME_FIELD).toHaveProperty('config_group');
    expect(CONFIG_GROUP_RUNTIME_FIELD.config_group).toMatchObject({
      type: 'keyword',
      script: { lang: 'painless' },
    });
  });

  it('script source covers all required sections', () => {
    const source = (CONFIG_GROUP_RUNTIME_FIELD.config_group as any).script.source as string;
    expect(source).toContain('receivers');
    expect(source).toContain('processors');
    expect(source).toContain('exporters');
    expect(source).toContain('connectors');
    expect(source).toContain('service.pipelines');
    expect(source).toContain('service.extensions');
    expect(source).toContain('emit');
  });
});
