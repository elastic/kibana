/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LegacyTemplateSerialized, TemplateSerialized } from '../types';
import { IndexMode } from '../constants';
import { isLegacyTemplate, buildTemplateSettings } from './utils';

describe('utils', () => {
  describe('isLegacyTemplate', () => {
    test('should detect legacy template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        mappings: {
          properties: {},
        },
      };
      expect(isLegacyTemplate(template as LegacyTemplateSerialized)).toBe(true);
    });

    test('should detect composable template', () => {
      const template = {
        name: 'my_template',
        index_patterns: ['logs*'],
        template: {
          mappings: {
            properties: {},
          },
        },
      };
      expect(isLegacyTemplate(template as TemplateSerialized)).toBe(false);
    });
  });

  describe('buildTemplateSettings', () => {
    test('should return undefined when template is undefined and no indexMode', () => {
      const result = buildTemplateSettings(undefined, undefined);
      expect(result).toBeUndefined();
    });

    test('should return undefined when template has no settings and no indexMode', () => {
      const result = buildTemplateSettings({}, undefined);
      expect(result).toBeUndefined();
    });

    test('should include indexMode when provided', () => {
      const result = buildTemplateSettings({}, IndexMode.logsdb);
      expect(result).toEqual({
        index: {
          mode: IndexMode.logsdb,
        },
      });
    });

    test('should remove existing mode and add new indexMode', () => {
      const template = {
        settings: {
          index: {
            mode: IndexMode.standard,
            number_of_shards: 3,
          },
        },
      };
      const result = buildTemplateSettings(template, IndexMode.time_series);
      expect(result).toEqual({
        index: {
          number_of_shards: 3,
          mode: IndexMode.time_series,
        },
      });
    });

    test('should remove existing mode when indexMode is undefined', () => {
      const template = {
        settings: {
          index: {
            mode: IndexMode.standard,
            number_of_shards: 3,
          },
        },
      };
      const result = buildTemplateSettings(template, undefined);
      expect(result).toEqual({
        index: {
          number_of_shards: 3,
        },
      });
    });

    test('should preserve other index settings when adding mode', () => {
      const template = {
        settings: {
          index: {
            number_of_shards: 5,
            number_of_replicas: 2,
            refresh_interval: '1s',
          },
        },
      };
      const result = buildTemplateSettings(template, IndexMode.logsdb);
      expect(result).toEqual({
        index: {
          number_of_shards: 5,
          number_of_replicas: 2,
          refresh_interval: '1s',
          mode: IndexMode.logsdb,
        },
      });
    });

    test('should preserve other settings outside of index', () => {
      const template = {
        settings: {
          number_of_shards: 3,
          other_setting: 10000,
        },
      };
      const result = buildTemplateSettings(template, IndexMode.time_series);
      expect(result).toEqual({
        number_of_shards: 3,
        other_setting: 10000,
        index: {
          mode: IndexMode.time_series,
        },
      });
    });

    test('should return only non-index settings when no indexMode and no index settings', () => {
      const template = {
        settings: {
          number_of_shards: 3,
          other_setting: 10000,
        },
      };
      const result = buildTemplateSettings(template, undefined);
      expect(result).toEqual({
        number_of_shards: 3,
        other_setting: 10000,
      });
    });

    test('should return undefined when only mode exists and indexMode is undefined', () => {
      const template = {
        settings: {
          index: {
            mode: IndexMode.standard,
          },
        },
      };
      const result = buildTemplateSettings(template, undefined);
      expect(result).toBeUndefined();
    });

    test('should handle complex nested settings', () => {
      const template = {
        settings: {
          analysis: {
            analyzer: {
              my_analyzer: {
                type: 'standard',
                tokenizer: 'standard',
              },
            },
          },
          index: {
            mode: IndexMode.standard,
            number_of_shards: 1,
            lifecycle: {
              name: 'my_policy',
            },
          },
        },
      };
      const result = buildTemplateSettings(template, IndexMode.logsdb);
      expect(result).toEqual({
        analysis: {
          analyzer: {
            my_analyzer: {
              type: 'standard',
              tokenizer: 'standard',
            },
          },
        },
        index: {
          number_of_shards: 1,
          lifecycle: {
            name: 'my_policy',
          },
          mode: IndexMode.logsdb,
        },
      });
    });
  });
});
