/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse as yamlParse } from 'yaml';
import { getTemplateMetadataFromYaml, setTemplateMetadataInYaml } from './template_metadata_yaml';

describe('template_metadata_yaml', () => {
  it('writes template-prefixed metadata keys into YAML', () => {
    const next = setTemplateMetadataInYaml('name: Case default\nfields: []', {
      name: 'Template metadata',
      description: 'Template description',
      tags: ['a', 'b'],
    });

    const parsed = yamlParse(next) as Record<string, unknown>;
    expect(parsed.template_name).toEqual('Template metadata');
    expect(parsed.template_description).toEqual('Template description');
    expect(parsed.template_tags).toEqual(['a', 'b']);
    expect(parsed.name).toEqual('Case default');
  });

  it('reads template-prefixed metadata keys from YAML', () => {
    const metadata = getTemplateMetadataFromYaml(
      `template_name: Template metadata
template_description: Template description
template_tags:
  - one
  - two
fields: []`,
      { name: 'Fallback', description: '', tags: [] }
    );

    expect(metadata).toEqual({
      name: 'Template metadata',
      description: 'Template description',
      tags: ['one', 'two'],
    });
  });

  it('falls back when template-prefixed metadata keys are missing', () => {
    const metadata = getTemplateMetadataFromYaml('name: Case default\nfields: []', {
      name: 'Fallback',
      description: 'Fallback description',
      tags: ['fallback-tag'],
    });

    expect(metadata).toEqual({
      name: 'Fallback',
      description: 'Fallback description',
      tags: ['fallback-tag'],
    });
  });

  it('keeps existing template metadata keys visible when values are cleared', () => {
    const next = setTemplateMetadataInYaml(
      `template_name: Existing
template_description: Existing description
template_tags:
  - existing
fields: []`,
      { name: '', description: '', tags: [] }
    );

    const parsed = yamlParse(next) as Record<string, unknown>;
    expect(parsed.template_name).toEqual('');
    expect(parsed.template_description).toEqual('');
    expect(parsed.template_tags).toEqual([]);
  });

  it('does not add empty template metadata keys when they are absent', () => {
    const next = setTemplateMetadataInYaml('name: Case default title\nfields: []', {
      name: '',
      description: '',
      tags: [],
    });

    const parsed = yamlParse(next) as Record<string, unknown>;
    expect(parsed).not.toHaveProperty('template_name');
    expect(parsed).not.toHaveProperty('template_description');
    expect(parsed).not.toHaveProperty('template_tags');
  });
});
