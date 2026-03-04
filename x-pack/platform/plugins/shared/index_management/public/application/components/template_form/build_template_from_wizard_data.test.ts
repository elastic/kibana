/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TemplateDeserialized } from '../../../../common';
import { buildTemplateFromWizardData } from './build_template_from_wizard_data';

describe('buildTemplateFromWizardData', () => {
  test('preserves data stream configuration (including unknown keys)', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {
        hidden: true,
        anyUnknownKey: 'should_be_kept',
      },
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: [],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics: {
          ...logistics,
          version: 1,
          lifecycle: { enabled: true, value: 1, unit: 'd' },
        },
        settings: undefined,
        mappings: undefined,
        aliases: undefined,
        components: [],
      },
    });

    expect(result.dataStream).toEqual({
      hidden: true,
      anyUnknownKey: 'should_be_kept',
    });
    expect(result.version).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(result, 'lifecycle')).toBe(false);
    expect(result.template?.lifecycle).toEqual({
      enabled: true,
      data_retention: '1d',
    });
  });

  test('includes data stream options when provided', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'template_with_ds_options',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: [],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics,
        settings: undefined,
        mappings: undefined,
        aliases: undefined,
        components: [],
      },
      dataStreamOptions: { failure_store: { enabled: true } },
    });

    expect(result.template?.data_stream_options).toEqual({ failure_store: { enabled: true } });
  });

  test('keeps mappings when added in the wizard', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'index_template_without_mappings',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: [],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics,
        mappings: {
          properties: {
            field_1: { type: 'text' },
          },
        },
        settings: undefined,
        aliases: undefined,
        components: [],
      },
    });

    expect(result.template?.mappings).toEqual({
      properties: {
        field_1: { type: 'text' },
      },
    });
  });

  test('keeps settings when added in the wizard', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'index_template_without_settings',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: [],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics,
        settings: {
          index: {
            number_of_shards: 2,
          },
        },
        mappings: undefined,
        aliases: undefined,
        components: [],
      },
    });

    expect(result.template?.settings).toEqual({
      index: {
        number_of_shards: 2,
      },
    });
  });

  test('keeps aliases when added in the wizard', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'index_template_without_aliases',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: [],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics,
        aliases: {
          my_alias: {
            is_write_index: true,
          },
        },
        settings: undefined,
        mappings: undefined,
        components: [],
      },
    });

    expect(result.template?.aliases).toEqual({
      my_alias: {
        is_write_index: true,
      },
    });
  });

  test('uses wizard component templates instead of initial template', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'template_with_components',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: [],
      composedOf: ['initial_component'],
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics,
        settings: undefined,
        mappings: undefined,
        aliases: undefined,
        components: ['wizard_component'],
      },
    });

    expect(result.composedOf).toEqual(['wizard_component']);
  });

  test('preserves initial template-only fields', () => {
    const initialTemplate: TemplateDeserialized = {
      name: 'template_with_preserved_fields',
      indexPatterns: ['indexPattern1'],
      dataStream: {},
      indexMode: 'standard',
      template: {},
      allowAutoCreate: 'NO_OVERWRITE',
      ignoreMissingComponentTemplates: ['initial_missing_component'],
      composedOf: [],
      deprecated: true,
      _kbnMeta: {
        type: 'default',
        hasDatastream: true,
        isLegacy: false,
      },
    };

    const { _kbnMeta: _ignoredKbnMeta, template: _ignoredTemplate, ...logistics } = initialTemplate;

    const result = buildTemplateFromWizardData({
      initialTemplate,
      wizardData: {
        logistics: {
          ...logistics,
          deprecated: false,
          ignoreMissingComponentTemplates: [],
        },
        settings: undefined,
        mappings: undefined,
        aliases: undefined,
        components: [],
      },
    });

    expect(result._kbnMeta).toEqual(initialTemplate._kbnMeta);
    expect(result.deprecated).toBe(true);
    expect(result.ignoreMissingComponentTemplates).toEqual(['initial_missing_component']);
  });
});
