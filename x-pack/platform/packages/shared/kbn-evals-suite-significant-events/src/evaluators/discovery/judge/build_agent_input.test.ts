/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDiscoveryJudgeInput } from './build_agent_input';

describe('buildDiscoveryJudgeInput', () => {
  it('emits the Unreviewed Discoveries section with compact JSON', () => {
    expect(buildDiscoveryJudgeInput({ discoveries: [{ discovery_slug: 'svc__x-s' }] })).toBe(
      '## Unreviewed Discoveries\n[{"discovery_slug":"svc__x-s"}]'
    );
  });
});
