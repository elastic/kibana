/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDiscoveryInput } from './build_agent_input';

describe('buildDiscoveryInput', () => {
  it('emits only the Active batch heading with compact JSON', () => {
    const input = buildDiscoveryInput({
      detections: [{ rule_uuid: 'r1' }],
    });

    expect(input).toBe('## Active batch\n[{"rule_uuid":"r1"}]');
    expect(input).not.toContain('\n  '); // not pretty-printed
  });

  it('renders an empty batch correctly', () => {
    const input = buildDiscoveryInput({ detections: [] });
    expect(input).toBe('## Active batch\n[]');
  });
});
