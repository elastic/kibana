/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { siem } from '.';

describe('siem plugin tests', () => {
  // This test is a temporary test which is so we do not accidentally check-in
  // feature flags turned on from "alerting" and "actions". If those get
  // turned on during a check-in it will cause everyone's Kibana to not start.
  // Once alerting and actions are part of the plugins by default this test
  // should be removed.
  test(`
    You have accidentally tried to check-in a feature flag with alerting located
    here: x-pack/legacy/plugins/siem/index.ts, please change the plugin require to
    NOT have these two inside of the require array."
  `, () => {
    class MockPlugin {
      require: string[];
      constructor({ require }: { require: string[] }) {
        this.require = require;
      }
    }
    const plugin = siem({ Plugin: MockPlugin });
    expect(plugin.require.includes('alerting')).toBe(false);
    expect(plugin.require.includes('actions')).toBe(false);
  });
});
