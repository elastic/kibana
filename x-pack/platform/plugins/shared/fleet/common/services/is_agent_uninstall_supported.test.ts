/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getAgentUninstallIneligibleReason,
  isAgentUninstallCapable,
  isAgentUninstallSupported,
  isUninstallDelayValid,
  UNINSTALL_DELAY_MAX_SECONDS,
  UNINSTALL_DELAY_MIN_SECONDS,
} from './is_agent_uninstall_supported';

const makeAgent = ({
  active = true,
  uninstallPending = true,
  agentMetadata = { uninstallable: true },
}: {
  active?: boolean;
  uninstallPending?: boolean;
  agentMetadata?: Record<string, unknown> | null;
} = {}) =>
  ({
    active,
    uninstall_pending: uninstallPending,
    local_metadata: { elastic: { agent: agentMetadata } },
  } as any);

describe('getAgentUninstallIneligibleReason', () => {
  it('returns undefined for an active, uninstallable, privileged, unenrolled agent', () => {
    expect(getAgentUninstallIneligibleReason(makeAgent())).toBeUndefined();
    expect(isAgentUninstallSupported(makeAgent())).toBe(true);
  });

  it('returns not_supported when the uninstallable flag is missing or false', () => {
    expect(getAgentUninstallIneligibleReason(makeAgent({ agentMetadata: {} }))).toBe(
      'not_supported'
    );
    expect(
      getAgentUninstallIneligibleReason(makeAgent({ agentMetadata: { uninstallable: false } }))
    ).toBe('not_supported');
    expect(getAgentUninstallIneligibleReason(makeAgent({ agentMetadata: null }))).toBe(
      'not_supported'
    );
    expect(getAgentUninstallIneligibleReason({ active: true, local_metadata: {} } as any)).toBe(
      'not_supported'
    );
  });

  it('does not treat a non-boolean uninstallable flag as supported', () => {
    expect(
      getAgentUninstallIneligibleReason(makeAgent({ agentMetadata: { uninstallable: 'true' } }))
    ).toBe('not_supported');
  });

  it('returns not_supported for an inactive agent', () => {
    expect(getAgentUninstallIneligibleReason(makeAgent({ active: false }))).toBe('not_supported');
  });

  it('returns unprivileged for an unprivileged agent', () => {
    expect(
      getAgentUninstallIneligibleReason(
        makeAgent({ agentMetadata: { uninstallable: true, unprivileged: true } })
      )
    ).toBe('unprivileged');
  });

  it('returns not_unenrolled when the agent is not pending uninstall', () => {
    expect(getAgentUninstallIneligibleReason(makeAgent({ uninstallPending: false }))).toBe(
      'not_unenrolled'
    );
    expect(
      getAgentUninstallIneligibleReason({
        active: true,
        local_metadata: { elastic: { agent: { uninstallable: true } } },
      } as any)
    ).toBe('not_unenrolled');
  });
});

describe('isAgentUninstallCapable', () => {
  it('only depends on the uninstallable flag', () => {
    expect(isAgentUninstallCapable(makeAgent({ uninstallPending: false }))).toBe(true);
    expect(isAgentUninstallCapable(makeAgent({ agentMetadata: {} }))).toBe(false);
    expect(isAgentUninstallCapable({ local_metadata: {} } as any)).toBe(false);
  });
});

describe('isUninstallDelayValid', () => {
  it('accepts values within the 1h-24h bounds', () => {
    expect(isUninstallDelayValid(UNINSTALL_DELAY_MIN_SECONDS)).toBe(true);
    expect(isUninstallDelayValid(UNINSTALL_DELAY_MAX_SECONDS)).toBe(true);
    expect(isUninstallDelayValid(2 * 60 * 60)).toBe(true);
  });

  it('rejects zero, out-of-range and non-integer values', () => {
    expect(isUninstallDelayValid(0)).toBe(false);
    expect(isUninstallDelayValid(UNINSTALL_DELAY_MIN_SECONDS - 1)).toBe(false);
    expect(isUninstallDelayValid(UNINSTALL_DELAY_MAX_SECONDS + 1)).toBe(false);
    expect(isUninstallDelayValid(3600.5)).toBe(false);
    expect(isUninstallDelayValid(Number.NaN)).toBe(false);
  });
});
