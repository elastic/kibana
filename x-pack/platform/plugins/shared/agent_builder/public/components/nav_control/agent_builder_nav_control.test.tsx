/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

import { useUiPrivileges } from '../../application/hooks/use_ui_privileges';
import { AgentBuilderNavControl } from './agent_builder_nav_control';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../application/hooks/use_ui_privileges', () => ({
  useUiPrivileges: jest.fn(),
}));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseUiPrivileges = useUiPrivileges as jest.MockedFunction<typeof useUiPrivileges>;

describe('AgentBuilderNavControl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('toggles the sidebar when the nav button is clicked', () => {
    const toggleConversationFlyout = jest.fn();
    const openChat$ = new BehaviorSubject(AIChatExperience.Classic);

    mockUseUiPrivileges.mockReturnValue({ show: true } as any);
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          toggleConversationFlyout,
          openConversationFlyout: jest.fn(),
        },
        aiAssistantManagementSelection: {
          openChat$,
          completeOpenChat: jest.fn(),
        },
      },
    } as any);

    render(
      <IntlProvider locale="en">
        <AgentBuilderNavControl />
      </IntlProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Agent Builder' }));
    expect(toggleConversationFlyout).toHaveBeenCalledTimes(1);
  });

  it('toggles the sidebar on Cmd/Ctrl+; keyboard shortcut', () => {
    const toggleConversationFlyout = jest.fn();
    const openChat$ = new BehaviorSubject(AIChatExperience.Classic);

    mockUseUiPrivileges.mockReturnValue({ show: true } as any);
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          toggleConversationFlyout,
          openConversationFlyout: jest.fn(),
        },
        aiAssistantManagementSelection: {
          openChat$,
          completeOpenChat: jest.fn(),
        },
      },
    } as any);

    render(
      <IntlProvider locale="en">
        <AgentBuilderNavControl />
      </IntlProvider>
    );

    // Provide both ctrlKey and metaKey so the assertion is platform-independent
    fireEvent.keyDown(window, { key: ';', code: 'Semicolon', ctrlKey: true, metaKey: true });
    expect(toggleConversationFlyout).toHaveBeenCalledTimes(1);
  });

  it('opens the sidebar when openChat$ emits Agent', () => {
    const toggleConversationFlyout = jest.fn();
    const openConversationFlyout = jest.fn();
    const completeOpenChat = jest.fn();
    const openChat$ = new BehaviorSubject(AIChatExperience.Classic);

    mockUseUiPrivileges.mockReturnValue({ show: true } as any);
    mockUseKibana.mockReturnValue({
      services: {
        agentBuilder: {
          toggleConversationFlyout,
          openConversationFlyout,
        },
        aiAssistantManagementSelection: {
          openChat$,
          completeOpenChat,
        },
      },
    } as any);

    render(
      <IntlProvider locale="en">
        <AgentBuilderNavControl />
      </IntlProvider>
    );

    act(() => {
      openChat$.next(AIChatExperience.Agent);
    });

    expect(openConversationFlyout).toHaveBeenCalledTimes(1);
    expect(completeOpenChat).toHaveBeenCalledTimes(1);
  });
});
