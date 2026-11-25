/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import {
  useAreAgentBuilderSkillsAvailable,
  useAgentBuilderSkillsRequirements,
} from './use_are_agent_builder_skills_available';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const setupMocks = ({ agentBuilderShow = true }: { agentBuilderShow?: boolean } = {}) => {
  mockCoreStart.mockImplementation((key: string) => key as any);

  mockUseService.mockImplementation((service: unknown) => {
    if (service === 'application') {
      return {
        capabilities: {
          agentBuilder: { show: agentBuilderShow },
        },
      } as any;
    }
    return undefined as any;
  });
};

describe('useAreAgentBuilderSkillsAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when the agent builder capability is enabled', () => {
    setupMocks({ agentBuilderShow: true });

    const { result } = renderHook(() => useAreAgentBuilderSkillsAvailable());

    expect(result.current).toBe(true);
  });

  it('returns false when the agent builder capability is disabled', () => {
    setupMocks({ agentBuilderShow: false });

    const { result } = renderHook(() => useAreAgentBuilderSkillsAvailable());

    expect(result.current).toBe(false);
  });

  it('returns false when agentBuilder capabilities are missing entirely', () => {
    mockCoreStart.mockImplementation((key: string) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'application') {
        return { capabilities: {} } as any;
      }
      return undefined as any;
    });

    const { result } = renderHook(() => useAreAgentBuilderSkillsAvailable());

    expect(result.current).toBe(false);
  });
});

describe('useAgentBuilderSkillsRequirements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reports the capability as met when the agent builder privilege is present', () => {
    setupMocks({ agentBuilderShow: true });

    const { result } = renderHook(() => useAgentBuilderSkillsRequirements());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: true,
    });
  });

  it('reports the missing capability when the agent builder privilege is absent', () => {
    setupMocks({ agentBuilderShow: false });

    const { result } = renderHook(() => useAgentBuilderSkillsRequirements());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: false,
    });
  });
});
