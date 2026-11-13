/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  decodeRouteParam,
  getAiIndexDetailPath,
  getAiIndexSourcesPath,
  getAiIndexKnowledgeIndicatorsPath,
  getKiDocQueryParams,
} from './paths';

describe('getAiIndexDetailPath', () => {
  it('builds the path without encoding the id', () => {
    expect(getAiIndexDetailPath('my-ai-index')).toBe('/ai_index/my-ai-index');
  });
});

describe('getAiIndexSourcesPath', () => {
  it('builds the sources tab path', () => {
    expect(getAiIndexSourcesPath('my-ai-index')).toBe('/ai_index/my-ai-index/sources');
  });
});

describe('getAiIndexKnowledgeIndicatorsPath', () => {
  it('builds the knowledge indicators tab path', () => {
    expect(getAiIndexKnowledgeIndicatorsPath('my-ai-index')).toBe(
      '/ai_index/my-ai-index/knowledge_indicators'
    );
  });
});

describe('getKiDocQueryParams', () => {
  it('returns the doc and index query params', () => {
    expect(getKiDocQueryParams('ki-1', 'my-index')).toEqual({ doc: 'ki-1', index: 'my-index' });
  });

  it('keeps ids with slashes as they are (URLSearchParams encodes them)', () => {
    const params = new URLSearchParams(getKiDocQueryParams('a/b c', 'idx'));
    expect(params.toString()).toBe('doc=a%2Fb+c&index=idx');
    expect(params.get('doc')).toBe('a/b c');
  });

  it('leaves out an empty index', () => {
    expect(getKiDocQueryParams('ki-1', '')).toEqual({ doc: 'ki-1' });
  });
});

describe('decodeRouteParam', () => {
  it('decodes a slash that history left encoded as %2F', () => {
    expect(decodeRouteParam('a%2Fb')).toBe('a/b');
  });

  it('returns the value as-is when it is not a valid percent-escape', () => {
    // history already ran `decodeURI` on this, turning the original `%25` into `%2`
    expect(decodeRouteParam('ki-1%2')).toBe('ki-1%2');
  });
});
