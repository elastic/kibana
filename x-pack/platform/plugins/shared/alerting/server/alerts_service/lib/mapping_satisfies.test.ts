/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { doesLiveMappingSatisfyTarget } from './mapping_satisfies';

describe('doesLiveMappingSatisfyTarget', () => {
  it('returns false when live mapping is missing', () => {
    expect(doesLiveMappingSatisfyTarget(undefined, { dynamic: false })).toBe(false);
  });

  it('returns true when live equals target', () => {
    const mapping: MappingTypeMapping = {
      dynamic: false,
      properties: { status: { type: 'keyword' } },
    };
    expect(doesLiveMappingSatisfyTarget(mapping, mapping)).toBe(true);
  });

  it('returns true when live has extra properties the target does not constrain', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        {
          dynamic: false,
          properties: {
            status: { type: 'keyword' },
            extra_dynamic: { type: 'keyword' },
          },
        },
        {
          dynamic: false,
          properties: { status: { type: 'keyword' } },
        }
      )
    ).toBe(true);
  });

  it('returns true when a nested object has extra live fields', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        {
          properties: {
            kibana: {
              properties: {
                alert: {
                  properties: {
                    uuid: { type: 'keyword' },
                    grouping: { properties: { host: { type: 'keyword' } } },
                  },
                },
              },
            },
          },
        },
        {
          properties: {
            kibana: {
              properties: {
                alert: {
                  properties: {
                    uuid: { type: 'keyword' },
                  },
                },
              },
            },
          },
        }
      )
    ).toBe(true);
  });

  it('returns false when a target property is missing on live', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        { properties: { status: { type: 'keyword' } } },
        { properties: { status: { type: 'keyword' }, reason: { type: 'keyword' } } }
      )
    ).toBe(false);
  });

  it('returns false when a target field type differs', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        { properties: { status: { type: 'text' } } },
        { properties: { status: { type: 'keyword' } } }
      )
    ).toBe(false);
  });

  it('treats string "false" as equivalent to boolean false', () => {
    expect(doesLiveMappingSatisfyTarget({ dynamic: 'false' }, { dynamic: false })).toBe(true);
  });

  it('ignores _meta differences', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        {
          dynamic: false,
          _meta: { kibana: { version: '8.8.0' } },
          properties: { status: { type: 'keyword' } },
        },
        {
          dynamic: false,
          _meta: { kibana: { version: '9.6.0' } },
          properties: { status: { type: 'keyword' } },
        }
      )
    ).toBe(true);
  });

  it('requires dynamic_templates to match exactly', () => {
    expect(
      doesLiveMappingSatisfyTarget(
        {
          dynamic_templates: [
            { strings: { match_mapping_type: 'string', mapping: { type: 'keyword' } } },
          ],
        },
        {
          dynamic_templates: [
            { strings: { match_mapping_type: 'string', mapping: { type: 'text' } } },
          ],
        }
      )
    ).toBe(false);
  });

  it('returns true when the target does not constrain any mapping keys', () => {
    expect(doesLiveMappingSatisfyTarget({ enabled: false }, {})).toBe(true);
  });
});
