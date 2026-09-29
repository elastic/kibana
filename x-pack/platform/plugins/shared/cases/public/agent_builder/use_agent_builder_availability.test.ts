/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../common/lib/kibana';
import { useLicense } from '../common/use_license';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';

vi.mock('../common/lib/kibana');
vi.mock('../common/use_license');
vi.mock('@kbn/kibana-react-plugin/public');

const useKibanaMock = useKibana as Mock;
const useLicenseMock = useLicense as Mock;
const useUiSetting$Mock = useUiSetting$ as Mock;

describe('useAgentBuilderAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: {
            agentBuilder: { show: true },
          },
        },
      },
    });
    useLicenseMock.mockReturnValue({ isAtLeastEnterprise: () => true });
    useUiSetting$Mock.mockReturnValue([AIChatExperience.Agent]);
  });

  it('is available when capability, chat experience, and license checks pass', () => {
    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current).toEqual({
      isAgentBuilderAvailable: true,
      hasAgentBuilderPrivilege: true,
      isAgentChatExperienceEnabled: true,
      hasValidAgentBuilderLicense: true,
    });
  });

  it('is unavailable when the user lacks Agent Builder privilege', () => {
    useKibanaMock.mockReturnValue({
      services: {
        application: {
          capabilities: {},
        },
      },
    });

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderAvailable).toBe(false);
    expect(result.current.hasAgentBuilderPrivilege).toBe(false);
  });

  it('is unavailable when chat experience is not Agent', () => {
    useUiSetting$Mock.mockReturnValue([AIChatExperience.Classic]);

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderAvailable).toBe(false);
    expect(result.current.isAgentChatExperienceEnabled).toBe(false);
  });

  it('is unavailable when license is not Enterprise', () => {
    useLicenseMock.mockReturnValue({ isAtLeastEnterprise: () => false });

    const { result } = renderHook(() => useAgentBuilderAvailability());

    expect(result.current.isAgentBuilderAvailable).toBe(false);
    expect(result.current.hasValidAgentBuilderLicense).toBe(false);
  });
});
