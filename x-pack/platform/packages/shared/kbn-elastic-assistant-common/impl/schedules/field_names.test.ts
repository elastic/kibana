/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE } from './field_names';

describe('ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE', () => {
  it('resolves to kibana.alert.attack_discovery.generation_source', () => {
    expect(ALERT_ATTACK_DISCOVERY_GENERATION_SOURCE).toBe(
      'kibana.alert.attack_discovery.generation_source'
    );
  });
});
