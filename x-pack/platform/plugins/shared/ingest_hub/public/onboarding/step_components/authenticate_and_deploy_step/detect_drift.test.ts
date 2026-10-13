/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectServiceVarsDrift, detectAuthDrift } from './detect_drift';

const emptyServicesMap = new Map();

const makeVars = (overrides = {}) => ({
  enabledDataStreams: ['logs'],
  varsByDataStream: {},
  ...overrides,
});

describe('detectServiceVarsDrift', () => {
  it('returns empty when both are empty', () => {
    expect(detectServiceVarsDrift({}, {}, emptyServicesMap)).toEqual([]);
  });

  it('returns empty when session matches SO', () => {
    const vars = makeVars({ enabledDataStreams: ['logs', 'metrics'] });
    // toSOServiceVars with empty servicesMap just copies the object
    const session = { inst1: vars };
    const so = { inst1: vars } as Record<string, Record<string, unknown>>;
    expect(detectServiceVarsDrift(session, so, emptyServicesMap)).toEqual([]);
  });

  it('returns dirty instance when enabledDataStreams differ', () => {
    const session = { inst1: makeVars({ enabledDataStreams: ['logs'] }) };
    const so = {
      inst1: makeVars({ enabledDataStreams: ['logs', 'metrics'] }) as unknown as Record<
        string,
        unknown
      >,
    };
    expect(detectServiceVarsDrift(session, so, emptyServicesMap)).toEqual(['inst1']);
  });

  it('returns dirty instance when varsByDataStream differ', () => {
    const session = {
      inst1: makeVars({
        varsByDataStream: {
          logs: { enabledInputs: ['s3'], varsByInput: { s3: { bucket_arn: 'arn:new' } } },
        },
      }),
    };
    const so = {
      inst1: makeVars({
        varsByDataStream: {
          logs: { enabledInputs: ['s3'], varsByInput: { s3: { bucket_arn: 'arn:old' } } },
        },
      }) as unknown as Record<string, unknown>,
    };
    expect(detectServiceVarsDrift(session, so, emptyServicesMap)).toEqual(['inst1']);
  });

  it('returns only dirty instances, not clean ones', () => {
    const shared = makeVars();
    const session = {
      inst1: shared,
      inst2: makeVars({ enabledDataStreams: ['changed'] }),
    };
    const so = {
      inst1: shared as unknown as Record<string, unknown>,
      inst2: makeVars() as unknown as Record<string, unknown>,
    };
    expect(detectServiceVarsDrift(session, so, emptyServicesMap)).toEqual(['inst2']);
  });

  it('ignores instances only in session (new, not yet in SO)', () => {
    const session = { inst1: makeVars(), newInst: makeVars({ enabledDataStreams: ['new'] }) };
    const so = { inst1: makeVars() as unknown as Record<string, unknown> };
    expect(detectServiceVarsDrift(session, so, emptyServicesMap)).toEqual([]);
  });

  it('detects drift for deployed instances missing from SO serviceVars (all-defaults deploy path)', () => {
    const session = { inst1: makeVars({ enabledDataStreams: ['changed'] }) };
    const so = {} as Record<string, Record<string, unknown>>;
    const deployed = new Set(['inst1']);
    expect(detectServiceVarsDrift(session, so, emptyServicesMap, deployed)).toEqual(['inst1']);
  });

  it('does not flag new instance when SO serviceVars is empty but instance not deployed', () => {
    const session = { newInst: makeVars({ enabledDataStreams: ['new'] }) };
    const so = {} as Record<string, Record<string, unknown>>;
    const deployed = new Set<string>(); // newInst not deployed
    expect(detectServiceVarsDrift(session, so, emptyServicesMap, deployed)).toEqual([]);
  });

  it('flags only the deployed instance, not new instances, when SO is empty', () => {
    const session = {
      inst1: makeVars({ enabledDataStreams: ['changed'] }),
      newInst: makeVars({ enabledDataStreams: ['new'] }),
    };
    const so = {} as Record<string, Record<string, unknown>>;
    const deployed = new Set(['inst1']);
    expect(detectServiceVarsDrift(session, so, emptyServicesMap, deployed)).toEqual(['inst1']);
  });

  it('ignores ECF-only instances in soServiceVars when deployedInstanceIds excludes them', () => {
    // Mixed MI+ECF deployment: SO has serviceVars for both MI (inst1) and ECF (ecf1).
    // User changed ecf1 settings in Step 2. MI redeploy cannot relaunch the ECF stack so
    // ecf1 must not appear as drift — only inst1 (which is in deployedInstanceIds) is checked.
    const session = {
      inst1: makeVars(),
      ecf1: makeVars({ enabledDataStreams: ['changed'] }),
    };
    const so = {
      inst1: makeVars() as unknown as Record<string, unknown>,
      ecf1: makeVars() as unknown as Record<string, unknown>,
    };
    const miDeployed = new Set(['inst1']); // ecf1 not in MI policyIdsByInstance
    expect(detectServiceVarsDrift(session, so, emptyServicesMap, miDeployed)).toEqual([]);
  });
});

describe('detectAuthDrift', () => {
  it('returns false when connectors match', () => {
    expect(detectAuthDrift({ connectorId: 'conn-a' }, { connectorId: 'conn-a' })).toBe(false);
  });

  it('returns false when both connectors are absent', () => {
    expect(detectAuthDrift({}, {})).toBe(false);
    expect(detectAuthDrift({ connectorId: undefined }, { connectorId: null })).toBe(false);
  });

  it('returns true when connectors differ', () => {
    expect(detectAuthDrift({ connectorId: 'conn-a' }, { connectorId: 'conn-b' })).toBe(true);
  });

  it('returns true when session has connector but SO does not', () => {
    expect(detectAuthDrift({ connectorId: 'conn-a' }, { connectorId: null })).toBe(true);
  });

  it('returns true when SO has connector but session does not', () => {
    expect(detectAuthDrift({}, { connectorId: 'conn-a' })).toBe(true);
  });
});
