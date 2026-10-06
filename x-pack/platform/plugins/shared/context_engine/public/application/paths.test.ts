/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKiDetailPath, parseKiIdFromRouteParam } from './paths';

describe('getKiDetailPath', () => {
  it('encodes KI ids that contain slashes', () => {
    expect(
      getKiDetailPath('quick-test', 'quick-test-metadata-2/traces-agent_builder.otel-default')
    ).toBe('/ai_index/quick-test/ki/quick-test-metadata-2%2Ftraces-agent_builder.otel-default');
  });
});

describe('parseKiIdFromRouteParam', () => {
  it('decodes encoded path segments', () => {
    expect(
      parseKiIdFromRouteParam('quick-test-metadata-2%2Ftraces-agent_builder.otel-default')
    ).toBe('quick-test-metadata-2/traces-agent_builder.otel-default');
  });

  it('returns plain ids unchanged', () => {
    expect(parseKiIdFromRouteParam('07220d23-c908-40ce-9278-0e6b233bb2bc')).toBe(
      '07220d23-c908-40ce-9278-0e6b233bb2bc'
    );
  });
});
