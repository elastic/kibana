/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { decodeRouteParam, getAiIndexDetailPath, getViewKiPath } from './paths';

describe('getAiIndexDetailPath', () => {
  it('builds the path without encoding the id', () => {
    expect(getAiIndexDetailPath('my-ai-index')).toBe('/ai_index/my-ai-index');
  });
});

describe('getViewKiPath', () => {
  it('does not encode the AI index id', () => {
    expect(getViewKiPath('my-ai-index', 'ki-1')).toBe('/ai_index/my-ai-index/ki/ki-1');
  });

  it('encodes KI ids that contain slashes', () => {
    expect(
      getViewKiPath('quick-test', 'quick-test-metadata-2/traces-agent_builder.otel-default')
    ).toBe('/ai_index/quick-test/ki/quick-test-metadata-2%2Ftraces-agent_builder.otel-default');
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
