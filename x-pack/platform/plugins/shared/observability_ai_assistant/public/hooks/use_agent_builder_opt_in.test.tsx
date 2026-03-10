/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { PREFERRED_CHAT_EXPERIENCE_SETTING_KEY } from '@kbn/ai-assistant-management-plugin/public';
import { useAgentBuilderOptIn } from './use_agent_builder_opt_in';
import * as useKibanaModule from './use_kibana';
import * as useIsAgentBuilderEnabledModule from './use_is_agent_builder_enabled';

interface AgentBuilderStart {
  openConversationFlyout?: jest.Mock;
}

interface KibanaServices {
  application: {
    navigateToApp: jest.Mock;
    capabilities: {
      advancedSettings: {
        save: boolean;
      };
    };
  };
  notifications: {
    toasts: {
      addError: jest.Mock;
    };
  };
  settings: {
    client: {
      set: jest.Mock;
    };
  };
  plugins: {
    start: {
      agentBuilder?: AgentBuilderStart;
    };
  };
}

const createMockServices = (overrides: Partial<KibanaServices> = {}): KibanaServices => {
  return {
    application: {
      navigateToApp: jest.fn(),
      capabilities: {
        advancedSettings: {
          save: true,
        },
      },
      ...(overrides.application ?? {}),
    },
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
      ...(overrides.notifications ?? {}),
    },
    settings: {
      client: {
        set: jest.fn(),
      },
      ...(overrides.settings ?? {}),
    },
    plugins: {
      start: {
        agentBuilder: {
          openConversationFlyout: jest.fn(),
        },
        ...(overrides.plugins?.start ?? {}),
      },
    },
  };
};

const mockServices = createMockServices();

jest.spyOn(useKibanaModule, 'useKibana').mockReturnValue({ services: mockServices } as any);

const useIsAgentBuilderEnabledSpy = jest.spyOn(
  useIsAgentBuilderEnabledModule,
  'useIsAgentBuilderEnabled'
);

describe('useAgentBuilderOptIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useIsAgentBuilderEnabledSpy.mockReturnValue({
      hasAgentBuilderAccess: true,
      isAgentChatExperienceEnabled: false,
      isAgentBuilderEnabled: false,
    });
    (mockServices.application!.capabilities as any).advancedSettings.save = true;
    (mockServices.plugins.start.agentBuilder as AgentBuilderStart).openConversationFlyout =
      jest.fn() as jest.Mock;
  });

  it('shows opt-in CTA when user has agent builder access, can edit settings, chat experience is not Agent and agentBuilder is available', () => {
    const { result } = renderHook(() => useAgentBuilderOptIn());
    expect(result.current.showAgentBuilderOptInCta).toBe(true);
  });

  it('hides opt-in CTA when user does not have agent builder access', () => {
    useIsAgentBuilderEnabledSpy.mockReturnValue({
      hasAgentBuilderAccess: false,
      isAgentChatExperienceEnabled: false,
      isAgentBuilderEnabled: false,
    });

    const { result } = renderHook(() => useAgentBuilderOptIn());

    expect(result.current.showAgentBuilderOptInCta).toBe(false);
  });

  it('hides opt-in CTA when chat experience is already Agent', () => {
    useIsAgentBuilderEnabledSpy.mockReturnValue({
      hasAgentBuilderAccess: true,
      isAgentChatExperienceEnabled: true,
      isAgentBuilderEnabled: true,
    });

    const { result } = renderHook(() => useAgentBuilderOptIn());

    expect(result.current.showAgentBuilderOptInCta).toBe(false);
  });

  it('hides opt-in CTA when user cannot edit advanced settings', () => {
    (mockServices.application!.capabilities as any).advancedSettings.save = false;

    const { result } = renderHook(() => useAgentBuilderOptIn());

    expect(result.current.showAgentBuilderOptInCta).toBe(false);
  });

  it('hides opt-in CTA when the agentBuilder plugin is not available', () => {
    const localServices = createMockServices({
      plugins: { start: { agentBuilder: undefined } },
    });

    (useKibanaModule.useKibana as jest.Mock).mockReturnValueOnce({
      services: localServices,
    } as any);

    const { result } = renderHook(() => useAgentBuilderOptIn());

    expect(result.current.showAgentBuilderOptInCta).toBe(false);
  });

  it('opens and closes the opt-in confirmation modal as expected', () => {
    const { result } = renderHook(() => useAgentBuilderOptIn());

    expect(result.current.isAgentBuilderConfirmationModalOpen).toBe(false);

    act(() => {
      result.current.openAgentBuilderConfirmationModal();
    });

    expect(result.current.isAgentBuilderConfirmationModalOpen).toBe(true);

    act(() => {
      result.current.closeAgentBuilderConfirmationModal();
    });

    expect(result.current.isAgentBuilderConfirmationModalOpen).toBe(false);
  });

  it('confirms opt-in: updates relevant UI settings, and opens the agent builder flyout', async () => {
    const servicesWithNavigation = createMockServices();

    (useKibanaModule.useKibana as jest.Mock).mockReturnValueOnce({
      services: servicesWithNavigation,
    } as any);

    const { result } = renderHook(() =>
      useAgentBuilderOptIn({ navigateFromConversationApp: true })
    );

    await act(async () => {
      await result.current.confirmAgentBuilderOptIn();
    });

    expect(servicesWithNavigation.settings!.client!.set).toHaveBeenCalledWith(
      PREFERRED_CHAT_EXPERIENCE_SETTING_KEY,
      AIChatExperience.Agent
    );
    expect(servicesWithNavigation.application!.navigateToApp).toHaveBeenCalledWith(
      'observability',
      { path: '/' }
    );
    expect(
      (servicesWithNavigation.plugins.start.agentBuilder as AgentBuilderStart)
        .openConversationFlyout
    ).toHaveBeenCalledWith({ newConversation: true });
  });

  it('shows error toast when the UI settings update fails', async () => {
    const error = new Error('settings failed');

    const servicesWithError = createMockServices();
    (servicesWithError.settings!.client!.set as jest.Mock).mockRejectedValue(error);

    const addError = servicesWithError.notifications!.toasts!.addError as jest.Mock;

    (useKibanaModule.useKibana as jest.Mock).mockReturnValueOnce({
      services: servicesWithError,
    } as any);

    const { result } = renderHook(() => useAgentBuilderOptIn());

    await act(async () => {
      await result.current.confirmAgentBuilderOptIn();
    });

    expect(addError).toHaveBeenCalled();
  });
});
