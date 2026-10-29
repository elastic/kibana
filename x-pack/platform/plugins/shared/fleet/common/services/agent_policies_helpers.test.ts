/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, PackagePolicy } from '../types';

import { policyHasFleetServer } from './agent_policies_helpers';

const packagePolicy = (packageName: string) =>
  ({ id: packageName, package: { name: packageName, title: packageName, version: '1.0.0' } } as
    | PackagePolicy
    | PackagePolicy);

const summary = (hasFleetServer: boolean): AgentPolicy['package_policies_summary'] => ({
  count: 1,
  has_fleet_server: hasFleetServer,
  has_managed: false,
  has_root_integrations: false,
  has_shared: false,
});

describe('policyHasFleetServer', () => {
  it('is true when a package policy is a Fleet Server one', () => {
    expect(
      policyHasFleetServer({
        package_policies: [packagePolicy('system'), packagePolicy('fleet_server')],
      })
    ).toBe(true);
  });

  it('is true when the policy is flagged as having a Fleet Server', () => {
    expect(policyHasFleetServer({ package_policies: [], has_fleet_server: true })).toBe(true);
  });

  it('is true when the package policies summary has a Fleet Server', () => {
    expect(policyHasFleetServer({ package_policies_summary: summary(true) })).toBe(true);
  });

  it('is false when none of them has a Fleet Server', () => {
    expect(
      policyHasFleetServer({
        package_policies: [packagePolicy('system')],
        package_policies_summary: summary(false),
        has_fleet_server: false,
      })
    ).toBe(false);
    expect(policyHasFleetServer({})).toBe(false);
  });
});
