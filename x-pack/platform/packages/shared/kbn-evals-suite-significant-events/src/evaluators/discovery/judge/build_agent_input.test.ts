/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDiscoveryJudgeInput } from './build_agent_input';

describe('buildDiscoveryJudgeInput', () => {
  it('emits the Unreviewed Discoveries section with an event_ids list', () => {
    expect(buildDiscoveryJudgeInput({ discoveries: [{ event_id: 'svc__x-s' }] })).toBe(
      '## Unreviewed Discoveries\n\nevent_ids: ["svc__x-s"]'
    );
  });
});
