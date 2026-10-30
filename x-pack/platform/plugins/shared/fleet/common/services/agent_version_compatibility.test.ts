/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIncompatibleIntegrations } from './agent_version_compatibility';

const aws = { name: 'aws', title: 'AWS', version: '9.0.0', version_condition: '>=9.4.0' };
const nginx = { name: 'nginx', title: 'Nginx', version: '1.0.0', version_condition: '>=8.0.0' };

describe('getIncompatibleIntegrations', () => {
  it('returns the integrations the agent is too old for', () => {
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.1.0', conditions: [aws, nginx] })
    ).toEqual([aws]);
  });

  it('returns nothing when the agent satisfies every condition', () => {
    expect(
      getIncompatibleIntegrations({ agentVersion: '9.4.0', conditions: [aws, nginx] })
    ).toEqual([]);
  });

  it('only looks at the given package when asked to', () => {
    expect(
      getIncompatibleIntegrations({
        agentVersion: '7.0.0',
        conditions: [aws, nginx],
        packageName: 'nginx',
      })
    ).toEqual([nginx]);
    expect(
      getIncompatibleIntegrations({
        agentVersion: '9.1.0',
        conditions: [aws, nginx],
        packageName: 'nginx',
      })
    ).toEqual([]);
  });

  it('returns nothing without an agent version or conditions', () => {
    expect(getIncompatibleIntegrations({ conditions: [aws] })).toEqual([]);
    expect(getIncompatibleIntegrations({ agentVersion: '9.1.0' })).toEqual([]);
    expect(getIncompatibleIntegrations({ agentVersion: '9.1.0', conditions: null })).toEqual([]);
  });

  it('ignores a condition that is not a valid range', () => {
    expect(
      getIncompatibleIntegrations({
        agentVersion: '9.1.0',
        conditions: [{ ...aws, version_condition: 'not a range' }],
      })
    ).toEqual([]);
  });

  it('ignores an agent version that is not valid semver', () => {
    expect(getIncompatibleIntegrations({ agentVersion: 'dev', conditions: [aws] })).toEqual([]);
  });
});
