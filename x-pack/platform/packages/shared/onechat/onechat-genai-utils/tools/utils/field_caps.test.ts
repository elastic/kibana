/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldCapsResponse,
  FieldCapsFieldCapability,
} from '@elastic/elasticsearch/lib/api/types';
import { processFieldCapsResponse } from './field_caps';

const caps = (
  source: { type: string } & Partial<FieldCapsFieldCapability>
): FieldCapsFieldCapability => {
  return {
    aggregatable: true,
    searchable: true,
    ...source,
  };
};

describe('processFieldCapsResponse', () => {
  it('returns the corresponding index list', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1', 'index_2'],
      fields: {},
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.indices).toEqual(['index_1', 'index_2']);
  });

  it('generates the corresponding field list', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1'],
      fields: {
        content: {
          text: caps({ type: 'text' }),
        },
        category: {
          keyword: caps({ type: 'keyword' }),
        },
      },
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        path: 'category',
        type: 'keyword',
        meta: {},
      },
      {
        path: 'content',
        type: 'text',
        meta: {},
      },
    ]);
  });

  it('excludes internal fields', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1'],
      fields: {
        content: {
          text: caps({ type: 'text' }),
        },
        _not_internal: {
          boolean: caps({ type: 'boolean' }),
        },
        _index_mode: {
          _index_mode: caps({ type: '_index_mode' }),
        },
      },
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        meta: {},
        path: '_not_internal',
        type: 'boolean',
      },
      {
        meta: {},
        path: 'content',
        type: 'text',
      },
    ]);
  });

  it('excludes conflicting fields', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1'],
      fields: {
        content: {
          text: caps({ type: 'text' }),
        },
        conflicting: {
          text: caps({ type: 'text' }),
          keyword: caps({ type: 'keyword' }),
        },
      },
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        meta: {},
        path: 'content',
        type: 'text',
      },
    ]);
  });

  it('retrieves the field meta', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1'],
      fields: {
        content: {
          text: caps({ type: 'text', meta: { description: 'content', role: 'retrieval' } }),
        },
        description: {
          text: caps({ type: 'text', meta: { description: ['desc1', 'desc2'] } }),
        },
      },
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        path: 'content',
        type: 'text',
        meta: { description: 'content', role: 'retrieval' },
      },
      {
        path: 'description',
        type: 'text',
        meta: { description: 'desc1,desc2' },
      },
    ]);
  });
});
