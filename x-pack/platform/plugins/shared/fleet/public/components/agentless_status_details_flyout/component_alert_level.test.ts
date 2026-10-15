/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent, PackagePolicy } from '../../types';

import { getComponentAlertLevel, getPackagePolicyUnitSummary } from './component_alert_level';

const packagePolicy = { id: 'pp-1', inputs: [{ id: 'input-1' }] } as unknown as PackagePolicy;

const unit = (id: string, type: 'input' | 'output', status: string) => ({
  id,
  type,
  status,
  message: '',
});

const agentWith = (units: Array<ReturnType<typeof unit>>): Agent =>
  ({ components: [{ id: 'c1', type: 'x', status: 'HEALTHY', message: '', units }] } as never);

describe('getComponentAlertLevel', () => {
  it('is null when the agent reports no components', () => {
    expect(getComponentAlertLevel({} as Agent, packagePolicy)).toBeNull();
  });

  it('is null when all units are healthy', () => {
    const agent = agentWith([
      unit('input-1', 'input', 'HEALTHY'),
      unit('x-input-1', 'output', 'HEALTHY'),
    ]);
    expect(getComponentAlertLevel(agent, packagePolicy)).toBeNull();
  });

  it('is failed when any unit failed, even if another is degraded', () => {
    const agent = agentWith([
      unit('input-1', 'input', 'DEGRADED'),
      unit('x-input-1', 'output', 'FAILED'),
    ]);
    expect(getComponentAlertLevel(agent, packagePolicy)).toBe('failed');
  });

  it('is degraded when a unit is degraded and none failed', () => {
    const agent = agentWith([unit('input-1', 'input', 'DEGRADED')]);
    expect(getComponentAlertLevel(agent, packagePolicy)).toBe('degraded');
  });

  it('ignores stopped units', () => {
    const agent = agentWith([unit('input-1', 'input', 'STOPPED')]);
    expect(getComponentAlertLevel(agent, packagePolicy)).toBeNull();
  });
});

describe('getPackagePolicyUnitSummary', () => {
  it('reports zero units when the agent has no components', () => {
    expect(getPackagePolicyUnitSummary({} as Agent, packagePolicy)).toEqual({
      total: 0,
      stopped: 0,
    });
  });

  it('reports zero units when the agent runs other integrations only', () => {
    const agent = agentWith([unit('other-input', 'input', 'HEALTHY')]);
    expect(getPackagePolicyUnitSummary(agent, packagePolicy)).toEqual({ total: 0, stopped: 0 });
  });

  it('counts the package policy units and the ones that are not running', () => {
    const agent = agentWith([
      unit('input-1', 'input', 'STOPPING'),
      unit('x-input-1', 'output', 'STOPPED'),
      unit('input-1-b', 'input', 'HEALTHY'),
      unit('other-input', 'input', 'STOPPED'),
    ]);
    expect(getPackagePolicyUnitSummary(agent, packagePolicy)).toEqual({ total: 3, stopped: 2 });
  });

  it('does not count starting or configuring units as stopped', () => {
    const agent = agentWith([
      unit('input-1', 'input', 'STARTING'),
      unit('x-input-1', 'output', 'CONFIGURING'),
    ]);
    expect(getPackagePolicyUnitSummary(agent, packagePolicy)).toEqual({ total: 2, stopped: 0 });
  });
});
