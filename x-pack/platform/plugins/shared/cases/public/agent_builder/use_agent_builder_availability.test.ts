/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { useKibana } from '../common/lib/kibana';
import { useLicense } from '../common/use_license';
import { useAgentBuilderAvailability } from './use_agent_builder_availability';

jest.mock('../common/lib/kibana');
jest.mock('../common/use_license');
jest.mock('@kbn/kibana-react-plugin/public');

const useKibanaMock = useKibana as jest.Mock;
const useLicenseMock = useLicense as jest.Mock;
const useUiSetting$Mock = useUiSetting$ as jest.Mock;

describe('useAgentBuilderAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
