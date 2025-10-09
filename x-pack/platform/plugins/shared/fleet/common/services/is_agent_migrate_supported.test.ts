/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from '../types';

import { isAgentMigrationSupported } from './is_agent_migrate_supported';

describe('isAgentMigrationSupported', () => {
  const createMockAgent = (overrides: Partial<Agent> = {}): Agent => ({
    id: 'test-agent',
    policy_id: 'test-policy',
    last_checkin: new Date().toISOString(),
    enrolled_at: new Date().toISOString(),
    active: true,
    packages: [],
    type: 'PERMANENT',
    components: [],
    local_metadata: {
      elastic: {
        agent: {
          version: '9.2.0',
          upgradeable: true,
        },
      },
    },
    ...overrides,
  });

  it('should return true for agents with supported version and upgradeable=true', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.2.0' },
      local_metadata: {
        elastic: {
          agent: {
            version: '9.2.0',
            upgradeable: true,
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });

  it('should return true for agents with higher version and upgradeable=true', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.3.0' },
      local_metadata: {
        elastic: {
          agent: {
            version: '9.3.0',
            upgradeable: true,
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });

  it('should return false for agents with unsupported version', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.1.0' },
      local_metadata: {
        elastic: {
          agent: {
            version: '9.1.0',
            upgradeable: true,
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(false);
  });

  it('should return false for containerized agents (upgradeable=false)', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.2.0' },
      local_metadata: {
        elastic: {
          agent: {
            version: '9.2.0',
            upgradeable: false, // Containerized agent
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(false);
  });

  it('should return true for agents without local_metadata (backwards compatibility)', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.2.0' },
      local_metadata: undefined,
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });

  it('should return true for agents without agent.version (backwards compatibility)', () => {
    const agent = createMockAgent({
      agent: undefined,
      local_metadata: {
        elastic: {
          agent: {
            upgradeable: true,
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });

  it('should return false for containerized agents even without agent.version', () => {
    const agent = createMockAgent({
      agent: undefined,
      local_metadata: {
        elastic: {
          agent: {
            upgradeable: false, // Containerized agent
          },
        },
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(false);
  });

  it('should handle missing local_metadata.elastic.agent gracefully', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.2.0' },
      local_metadata: {
        elastic: {},
      },
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });

  it('should handle missing local_metadata.elastic gracefully', () => {
    const agent = createMockAgent({
      agent: { id: 'test-agent', version: '9.2.0' },
      local_metadata: {},
    });

    expect(isAgentMigrationSupported(agent)).toBe(true);
  });
});
