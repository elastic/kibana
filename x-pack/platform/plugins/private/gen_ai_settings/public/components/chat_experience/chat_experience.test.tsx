/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { AI_CHAT_EXPERIENCE_TYPE } from '@kbn/management-settings-ids';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/onechat-common/telemetry';
import type { FieldDefinition, OnFieldChangeFn, UnsavedFieldChange } from '@kbn/management-settings-types';
import { ChatExperience } from './chat_experience';
import { useSettingsContext } from '../../contexts/settings_context';
import { useKibana } from '../../hooks/use_kibana';
import { getIsAiAgentsEnabled } from '@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled';

jest.mock('../../contexts/settings_context');
jest.mock('../../hooks/use_kibana');
jest.mock('@kbn/ai-assistant-common/src/utils/get_is_ai_agents_enabled');

let lastFieldRowProps: unknown;

jest.mock('@kbn/management-settings-components-field-row', () => {
  return {
    FieldRowProvider: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="fieldRowProvider">{children}</div>
    ),
    FieldRow: (props: unknown) => {
      lastFieldRowProps = props;
      return <div data-test-subj="fieldRow" />;
    },
  };
});

jest.mock('@kbn/ai-agent-confirmation-modal/ai_agent_confirmation_modal', () => {
  return {
    AIAgentConfirmationModal: ({
      onConfirm,
      onCancel,
    }: {
      onConfirm: () => void;
      onCancel: () => void;
    }) => (
      <div data-test-subj="confirmModal">
        <button data-test-subj="confirmModalConfirm" onClick={onConfirm} />
        <button data-test-subj="confirmModalCancel" onClick={onCancel} />
      </div>
    ),
  };
});

const mockUseSettingsContext = useSettingsContext as jest.MockedFunction<typeof useSettingsContext>;
const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockGetIsAiAgentsEnabled = getIsAiAgentsEnabled as jest.MockedFunction<
  typeof getIsAiAgentsEnabled
>;

type ReportEvent = (eventType: string, payload: Record<string, unknown>) => void;

interface CapturedFieldRowProps {
  onFieldChange: OnFieldChangeFn;
}

const setup = ({
  isAiAgentsEnabled = true,
  savedValue,
}: {
  isAiAgentsEnabled?: boolean;
  savedValue?: unknown;
} = {}) => {
  lastFieldRowProps = undefined;

  const handleFieldChange = jest.fn<ReturnType<OnFieldChangeFn>, Parameters<OnFieldChangeFn>>();
  const reportEvent = jest.fn<ReturnType<ReportEvent>, Parameters<ReportEvent>>();

  const unsavedChanges: Record<string, UnsavedFieldChange> = {};
  const fields: Record<string, FieldDefinition> =
    savedValue === undefined
      ? {}
      : {
          [AI_CHAT_EXPERIENCE_TYPE]: ({ savedValue } as unknown as FieldDefinition),
        };

  mockGetIsAiAgentsEnabled.mockReturnValue(isAiAgentsEnabled);
  mockUseSettingsContext.mockReturnValue(
    ({ fields, handleFieldChange, unsavedChanges } as unknown as ReturnType<typeof useSettingsContext>)
  );

  mockUseKibana.mockReturnValue(
    ({
      services: {
        settings: { client: { validateValue: jest.fn() } },
        notifications: { toasts: { addDanger: jest.fn() } },
        docLinks: { links: { management: {} as unknown } },
        application: { capabilities: { advancedSettings: { save: true } } },
        featureFlags: {} as unknown,
        analytics: { reportEvent },
      },
    } as unknown as ReturnType<typeof useKibana>)
  );

  const renderResult = render(<ChatExperience />);

  return {
    renderResult,
    handleFieldChange,
    reportEvent,
    fieldRowProps: () => lastFieldRowProps as unknown as CapturedFieldRowProps,
  };
};

describe('ChatExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastFieldRowProps = undefined;
  });

  it('returns null when AI agents are disabled', () => {
    const { renderResult } = setup({ isAiAgentsEnabled: false, savedValue: AIChatExperience.Classic });
    expect(renderResult.container.firstChild).toBeNull();
  });

  it('returns null when the field is missing', () => {
    const { renderResult } = setup({ isAiAgentsEnabled: true, savedValue: undefined });
    expect(renderResult.container.firstChild).toBeNull();
  });

  it('returns step_reached telemetry on initial render when current value is not Agent', async () => {
    const { reportEvent } = setup({ savedValue: AIChatExperience.Classic });
    await waitFor(() => {
      expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
        action: 'step_reached',
        source: 'stack_management',
        step: 'initial',
      });
    });
  });

  it('returns no step_reached telemetry on initial render when current value is Agent', () => {
    const { reportEvent } = setup({ savedValue: AIChatExperience.Agent });
    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('returns a confirmation modal when selecting Agent', () => {
    const { fieldRowProps } = setup({ savedValue: AIChatExperience.Classic });

    act(() => {
      fieldRowProps().onFieldChange(AI_CHAT_EXPERIENCE_TYPE, { unsavedValue: AIChatExperience.Agent });
    });

    expect(screen.getByTestId('confirmModal')).toBeInTheDocument();
  });

  it('returns confirmation_shown telemetry when selecting Agent', () => {
    const { reportEvent, fieldRowProps } = setup({ savedValue: AIChatExperience.Classic });

    act(() => {
      fieldRowProps().onFieldChange(AI_CHAT_EXPERIENCE_TYPE, { unsavedValue: AIChatExperience.Agent });
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'confirmation_shown',
      source: 'stack_management',
    });
  });

  it('returns opt out telemetry when switching from Agent to Classic', () => {
    const { reportEvent, fieldRowProps } = setup({ savedValue: AIChatExperience.Agent });

    act(() => {
      fieldRowProps().onFieldChange(AI_CHAT_EXPERIENCE_TYPE, {
        unsavedValue: AIChatExperience.Classic,
      });
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptOut, {
      source: 'stack_management',
    });
  });

  it('returns a cleared unsaved change when canceling the confirmation modal', () => {
    const { handleFieldChange, fieldRowProps } = setup({ savedValue: AIChatExperience.Classic });

    act(() => {
      fieldRowProps().onFieldChange(AI_CHAT_EXPERIENCE_TYPE, { unsavedValue: AIChatExperience.Agent });
    });

    act(() => {
      screen.getByTestId('confirmModalCancel').click();
    });

    expect(handleFieldChange).toHaveBeenCalledWith(AI_CHAT_EXPERIENCE_TYPE, undefined);
  });

  it('returns confirmed telemetry when confirming the modal', () => {
    const { reportEvent, fieldRowProps } = setup({ savedValue: AIChatExperience.Classic });

    act(() => {
      fieldRowProps().onFieldChange(AI_CHAT_EXPERIENCE_TYPE, { unsavedValue: AIChatExperience.Agent });
    });

    act(() => {
      screen.getByTestId('confirmModalConfirm').click();
    });

    expect(reportEvent).toHaveBeenCalledWith(AGENT_BUILDER_EVENT_TYPES.OptInAction, {
      action: 'confirmed',
      source: 'stack_management',
    });
  });
});


