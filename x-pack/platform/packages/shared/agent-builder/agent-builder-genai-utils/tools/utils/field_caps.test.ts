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
import { processFieldCapsResponse, processFieldCapsResponsePerIndex } from './field_caps';

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
        searchable: true,
      },
      {
        path: 'content',
        type: 'text',
        meta: {},
        searchable: true,
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
        searchable: true,
        path: '_not_internal',
        type: 'boolean',
      },
      {
        meta: {},
        searchable: true,
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
        searchable: true,
        path: 'content',
        type: 'text',
      },
    ]);
  });

  it('preserves the searchable property from field caps', () => {
    const response: FieldCapsResponse = {
      indices: ['index_1'],
      fields: {
        content: {
          text: caps({ type: 'text', searchable: true }),
        },
        non_searchable: {
          text: caps({ type: 'text', searchable: false }),
        },
      },
    };

    const processed = processFieldCapsResponse(response);

    expect(processed.fields.sort((a, b) => a.path.localeCompare(b.path))).toEqual([
      {
        path: 'content',
        type: 'text',
        meta: {},
        searchable: true,
      },
      {
        path: 'non_searchable',
        type: 'text',
        meta: {},
        searchable: false,
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
        searchable: true,
      },
      {
        path: 'description',
        type: 'text',
        meta: { description: 'desc1,desc2' },
        searchable: true,
      },
    ]);
  });
});

describe('processFieldCapsResponsePerIndex', () => {
  it('assigns shared fields to all indices when capability.indices is null', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a', 'index_b'],
      fields: {
        status: {
          keyword: caps({ type: 'keyword' }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    expect(result).toEqual({
      index_a: [{ path: 'status', type: 'keyword', meta: {}, searchable: true }],
      index_b: [{ path: 'status', type: 'keyword', meta: {}, searchable: true }],
    });
  });

  it('assigns fields to specific indices when capability.indices is set', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a', 'index_b'],
      fields: {
        shared: {
          keyword: caps({ type: 'keyword' }),
        },
        only_a: {
          text: caps({ type: 'text', indices: ['index_a'] }),
        },
        only_b: {
          long: caps({ type: 'long', indices: ['index_b'] }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    const sortByPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);

    expect(result.index_a.sort(sortByPath)).toEqual([
      { path: 'only_a', type: 'text', meta: {}, searchable: true },
      { path: 'shared', type: 'keyword', meta: {}, searchable: true },
    ]);
    expect(result.index_b.sort(sortByPath)).toEqual([
      { path: 'only_b', type: 'long', meta: {}, searchable: true },
      { path: 'shared', type: 'keyword', meta: {}, searchable: true },
    ]);
  });

  it('resolves type conflicts per-index instead of dropping them', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a', 'index_b'],
      fields: {
        status: {
          keyword: caps({ type: 'keyword', indices: ['index_a'] }),
          integer: caps({ type: 'integer', indices: ['index_b'] }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    expect(result.index_a).toEqual([
      { path: 'status', type: 'keyword', meta: {}, searchable: true },
    ]);
    expect(result.index_b).toEqual([
      { path: 'status', type: 'integer', meta: {}, searchable: true },
    ]);
  });

  it('excludes internal fields (type starting with _)', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a'],
      fields: {
        content: {
          text: caps({ type: 'text' }),
        },
        _index_mode: {
          _index_mode: caps({ type: '_index_mode' }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    expect(result.index_a).toEqual([{ path: 'content', type: 'text', meta: {}, searchable: true }]);
  });

  it('preserves field meta', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a'],
      fields: {
        content: {
          text: caps({ type: 'text', meta: { description: 'main content' } }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    expect(result.index_a).toEqual([
      { path: 'content', type: 'text', meta: { description: 'main content' }, searchable: true },
    ]);
  });

  it('returns empty arrays for indices with no fields', () => {
    const response: FieldCapsResponse = {
      indices: ['index_a', 'index_b'],
      fields: {
        only_a: {
          text: caps({ type: 'text', indices: ['index_a'] }),
        },
      },
    };

    const result = processFieldCapsResponsePerIndex(response);

    expect(result.index_a).toEqual([{ path: 'only_a', type: 'text', meta: {}, searchable: true }]);
    expect(result.index_b).toEqual([]);
  });
});
