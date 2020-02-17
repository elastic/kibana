/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractMappingsDefinition } from './extract_mappings_definition';

describe('extractMappingsDefinition', () => {
  test('should detect that the mappings has multiple types and return null', () => {
    const mappings = {
      type1: {
        properties: {
          name1: {
            type: 'keyword',
          },
        },
      },
      type2: {
        properties: {
          name2: {
            type: 'keyword',
          },
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toBe(null);
  });

  test('should detect that the mappings has multiple types even when one of the type has not defined any "properties"', () => {
    const mappings = {
      type1: {
        _source: {
          excludes: [],
          includes: [],
          enabled: true,
        },
        _routing: {
          required: false,
        },
      },
      type2: {
        properties: {
          name2: {
            type: 'keyword',
          },
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toBe(null);
  });

  test('should detect that one of the mapping type is invalid and filter it out', () => {
    const mappings = {
      type1: {
        invalidSetting: {
          excludes: [],
          includes: [],
          enabled: true,
        },
        _routing: {
          required: false,
        },
      },
      type2: {
        properties: {
          name2: {
            type: 'keyword',
          },
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toEqual({
      type: 'type2',
      mappings: mappings.type2,
    });
  });

  test('should detect that the mappings has one type and return its mapping definition', () => {
    const mappings = {
      myType: {
        _source: {
          excludes: [],
          includes: [],
          enabled: true,
        },
        _meta: {},
        _routing: {
          required: false,
        },
        dynamic: true,
        properties: {
          title: {
            type: 'keyword',
          },
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toEqual({
      type: 'myType',
      mappings: mappings.myType,
    });
  });

  test('should detect that the mappings has one custom type whose name matches a mappings definition parameter', () => {
    const mappings = {
      dynamic: {
        _source: {
          excludes: [],
          includes: [],
          enabled: true,
        },
        _meta: {},
        _routing: {
          required: false,
        },
        dynamic: true,
        properties: {
          title: {
            type: 'keyword',
          },
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toEqual({
      type: 'dynamic',
      mappings: mappings.dynamic,
    });
  });

  test('should detect that the mappings has one type at root level', () => {
    const mappings = {
      _source: {
        excludes: [],
        includes: [],
        enabled: true,
      },
      _meta: {},
      _routing: {
        required: false,
      },
      dynamic: true,
      numeric_detection: false,
      date_detection: true,
      dynamic_date_formats: ['strict_date_optional_time'],
      dynamic_templates: [],
      properties: {
        title: {
          type: 'keyword',
        },
      },
    };

    expect(extractMappingsDefinition(mappings)).toEqual({ mappings });
  });
});
