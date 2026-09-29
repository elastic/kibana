/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { useIsAgentBuilderEnabled } from './use_is_agent_builder_enabled';

const mockUseUiSetting$ = vi.fn();

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useUiSetting$: (...args: unknown[]) => mockUseUiSetting$(...args),
    };
      return { ...mocked, default: mocked };
    });

const mockCapabilities: { agentBuilder?: { show?: boolean } } = {};
const mockFeatureFlags = { getBooleanValue: vi.fn() };

vi.mock('./use_kibana', () => {
      const mocked = {
      useKibana: () => ({
        services: {
          application: {
            capabilities: mockCapabilities,
          },
          featureFlags: mockFeatureFlags,
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

describe('useIsAgentBuilderEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCapabilities.agentBuilder = { show: true };
  });

  it('reads the chat experience setting with the expected key', () => {
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);

    const { result } = renderHook(() => useIsAgentBuilderEnabled());

    expect(mockUseUiSetting$).toHaveBeenCalledWith(AI_CHAT_EXPERIENCE_TYPE);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
  });

  it('returns all flags true when chat experience is Agent and agent builder access is granted', () => {
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockCapabilities.agentBuilder = { show: true };

    const { result } = renderHook(() => useIsAgentBuilderEnabled());

    expect(result.current.hasAgentBuilderAccess).toBe(true);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
    expect(result.current.isAgentBuilderEnabled).toBe(true);
  });

  it('does not enable agent builder when chat experience is not Agent even if access is granted', () => {
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Classic]);
    mockCapabilities.agentBuilder = { show: true };

    const { result } = renderHook(() => useIsAgentBuilderEnabled());

    expect(result.current.hasAgentBuilderAccess).toBe(true);
    expect(result.current.isAgentChatExperienceEnabled).toBe(false);
    expect(result.current.isAgentBuilderEnabled).toBe(false);
  });

  it('does not enable agent builder when access is missing even if chat experience is Agent', () => {
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockCapabilities.agentBuilder = { show: false };

    const { result } = renderHook(() => useIsAgentBuilderEnabled());

    expect(result.current.hasAgentBuilderAccess).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
    expect(result.current.isAgentBuilderEnabled).toBe(false);
  });

  it('does not enable agent builder when the agentBuilder capabilities are missing', () => {
    mockUseUiSetting$.mockReturnValue([AIChatExperience.Agent]);
    mockCapabilities.agentBuilder = undefined;

    const { result } = renderHook(() => useIsAgentBuilderEnabled());

    expect(result.current.hasAgentBuilderAccess).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(true);
    expect(result.current.isAgentBuilderEnabled).toBe(false);
  });
});
