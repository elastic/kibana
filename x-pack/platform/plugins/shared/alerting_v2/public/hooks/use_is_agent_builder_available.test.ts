/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useService, CoreStart } from '@kbn/core-di-browser';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { useIsAgentBuilderAvailable } from './use_is_agent_builder_available';

jest.mock('@kbn/core-di-browser');

const mockUseService = useService as jest.MockedFunction<typeof useService>;
const mockCoreStart = CoreStart as jest.MockedFunction<typeof CoreStart>;

const setupMocks = ({
  agentBuilderShow = true,
  experimentalFeaturesEnabled = true,
}: {
  agentBuilderShow?: boolean;
  experimentalFeaturesEnabled?: boolean;
} = {}) => {
  mockCoreStart.mockImplementation((key: string) => key as any);

  mockUseService.mockImplementation((service: unknown) => {
    if (service === 'uiSettings') {
      return {
        get: (id: string) => {
          if (id === AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID) {
            return experimentalFeaturesEnabled;
          }
          return undefined;
        },
      } as any;
    }
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

describe('useIsAgentBuilderAvailable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns both flags as true when agent builder capability is enabled and experimental features are on', () => {
    setupMocks({ agentBuilderShow: true, experimentalFeaturesEnabled: true });

    const { result } = renderHook(() => useIsAgentBuilderAvailable());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: true,
      isExperimentalEnabled: true,
    });
  });

  it('returns hasAgentBuilderCapability false when agent builder capability is disabled', () => {
    setupMocks({ agentBuilderShow: false, experimentalFeaturesEnabled: true });

    const { result } = renderHook(() => useIsAgentBuilderAvailable());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: false,
      isExperimentalEnabled: true,
    });
  });

  it('returns isExperimentalEnabled false when experimental features are disabled', () => {
    setupMocks({ agentBuilderShow: true, experimentalFeaturesEnabled: false });

    const { result } = renderHook(() => useIsAgentBuilderAvailable());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: true,
      isExperimentalEnabled: false,
    });
  });

  it('returns both flags as false when both are disabled', () => {
    setupMocks({ agentBuilderShow: false, experimentalFeaturesEnabled: false });

    const { result } = renderHook(() => useIsAgentBuilderAvailable());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: false,
      isExperimentalEnabled: false,
    });
  });

  it('returns hasAgentBuilderCapability false when agentBuilder capabilities are missing entirely', () => {
    mockCoreStart.mockImplementation((key: string) => key as any);
    mockUseService.mockImplementation((service: unknown) => {
      if (service === 'uiSettings') {
        return {
          get: () => true,
        } as any;
      }
      if (service === 'application') {
        return { capabilities: {} } as any;
      }
      return undefined as any;
    });

    const { result } = renderHook(() => useIsAgentBuilderAvailable());

    expect(result.current).toEqual({
      hasAgentBuilderCapability: false,
      isExperimentalEnabled: true,
    });
  });
});
