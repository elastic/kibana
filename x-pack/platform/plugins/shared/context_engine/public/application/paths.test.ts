/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getViewKiPath } from './paths';

describe('getViewKiPath', () => {
  it('encodes KI ids that contain slashes', () => {
    expect(
      getViewKiPath('quick-test', 'quick-test-metadata-2/traces-agent_builder.otel-default')
    ).toBe('/ai_index/quick-test/ki/quick-test-metadata-2%2Ftraces-agent_builder.otel-default');
  });
});
