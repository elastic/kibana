/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deriveFleetTemplateId } from './derive_fleet_template_id';

describe('deriveFleetTemplateId', () => {
  it('derives the template id from a fleet-prefixed rule id', () => {
    expect(deriveFleetTemplateId('fleet-default-elastic_agent-cpu-usage', 'default')).toBe(
      'cpu-usage'
    );
  });

  it('derives the template id in a non-default space', () => {
    expect(deriveFleetTemplateId('fleet-my-space-elastic_agent-cpu-usage', 'my-space')).toBe(
      'cpu-usage'
    );
  });

  it('returns undefined when the rule id is undefined', () => {
    expect(deriveFleetTemplateId(undefined, 'default')).toBeUndefined();
  });

  it('returns undefined when the rule id does not have the fleet prefix', () => {
    expect(deriveFleetTemplateId('some-other-rule-id', 'default')).toBeUndefined();
  });

  it('returns undefined when there is no package/template split available', () => {
    expect(deriveFleetTemplateId('fleet-default-onlypkg', 'default')).toBeUndefined();
  });
});
