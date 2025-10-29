/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAgentEligibleForPrivilegeLevelChange } from './agent_privilege_level_change_helpers';

describe('isAgentEligibleForPrivilegeLevelChange', () => {
  it('should return true for privileged agents on a supported version with no root privilege required', () => {
    const agent = {
      agent: {
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: false,
          },
        },
      },
    } as any;
    const agentPolicy = {
      package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy)).toBe(true);
  });

  it('should return false for unprivileged agents', () => {
    const agent = {
      agent: {
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: true,
          },
        },
      },
    } as any;
    const agentPolicy = {
      package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy)).toBe(false);
  });

  it('should return false for agents on an unsupported version', () => {
    const agent = {
      agent: {
        version: '9.2.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: false,
          },
        },
      },
    } as any;
    const agentPolicy = {
      package_policies: [{ package: { name: 'some-integration', requires_root: false } }],
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy)).toBe(false);
  });

  it('should return false for agents with an integration that requires root privilege', () => {
    const agent = {
      agent: {
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: false,
          },
        },
      },
    } as any;
    const agentPolicy = {
      package_policies: [{ package: { name: 'some-integration', requires_root: true } }],
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy)).toBe(false);
  });

  it('should return false for agents on a policy with Fleet Server', () => {
    const agent = {
      agent: {
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: false,
          },
        },
      },
    } as any;
    const agentPolicy = {
      package_policies: [{ package: { name: 'fleet_server', requires_root: false } }],
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent, agentPolicy)).toBe(false);
  });

  it('should return true if no agent policy is provided and other conditions are met', () => {
    const agent = {
      agent: {
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            unprivileged: false,
          },
        },
      },
    } as any;
    expect(isAgentEligibleForPrivilegeLevelChange(agent)).toBe(true);
  });
});
