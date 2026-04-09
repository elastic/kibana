/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DefaultExperienceCallout } from './default_experience_callout';

const mockSetDismissed = jest.fn();
const mockOpenAgentBuilderConfirmationModal = jest.fn();
const mockCloseAgentBuilderConfirmationModal = jest.fn();
const mockConfirmAgentBuilderOptIn = jest.fn();

const mockUseIsAgentBuilderEnabled = jest.fn();
const mockUseDefaultExperienceCalloutDismissed = jest.fn();
const mockUseAgentBuilderOptIn = jest.fn();

jest.mock('@kbn/observability-ai-assistant-plugin/public', () => ({
  useIsAgentBuilderEnabled: (...args: unknown[]) => mockUseIsAgentBuilderEnabled(...args),
  useDefaultExperienceCalloutDismissed: (...args: unknown[]) =>
    mockUseDefaultExperienceCalloutDismissed(...args),
  useAgentBuilderOptIn: (...args: unknown[]) => mockUseAgentBuilderOptIn(...args),
}));

const mockGetUrlForApp = jest.fn().mockReturnValue('/app/management/ai/genAiSettings');

jest.mock('../hooks/use_kibana', () => ({
  useKibana: () => ({
    services: {
      application: {
        getUrlForApp: mockGetUrlForApp,
      },
      docLinks: {
        links: {
          agentBuilder: {
            agentBuilder: 'https://docs.elastic.co',
            learnMore: 'https://docs.elastic.co/agent-builder',
          },
        },
      },
    },
  }),
}));

jest.mock('@kbn/ai-agent-confirmation-modal', () => ({
  AIAgentConfirmationModal: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: () => void;
    onCancel: () => void;
  }) => (
    <div data-test-subj="aiAgentConfirmationModal">
      <button data-test-subj="confirmButton" onClick={onConfirm}>
        Confirm
      </button>
      <button data-test-subj="cancelButton" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

const renderCallout = (props: { isConversationApp: boolean } = { isConversationApp: false }) =>
  render(
    <IntlProvider locale="en">
      <DefaultExperienceCallout {...props} />
    </IntlProvider>
  );

describe('DefaultExperienceCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseIsAgentBuilderEnabled.mockReturnValue({
      hasAgentBuilderAccess: true,
      isAgentChatExperienceEnabled: false,
    });

    mockUseDefaultExperienceCalloutDismissed.mockReturnValue([false, mockSetDismissed]);

    mockUseAgentBuilderOptIn.mockReturnValue({
      showAgentBuilderOptInCta: true,
      isAgentBuilderConfirmationModalOpen: false,
      openAgentBuilderConfirmationModal: mockOpenAgentBuilderConfirmationModal,
      closeAgentBuilderConfirmationModal: mockCloseAgentBuilderConfirmationModal,
      confirmAgentBuilderOptIn: mockConfirmAgentBuilderOptIn,
    });
  });

  it('renders the callout when conditions are met', () => {
    renderCallout();

    expect(screen.getByText('AI Agent is becoming the default')).toBeInTheDocument();
    expect(screen.getByTestId('defaultExperienceCalloutTryAgentButton')).toBeInTheDocument();
  });

  it('renders nothing when already dismissed', () => {
    mockUseDefaultExperienceCalloutDismissed.mockReturnValue([true, mockSetDismissed]);

    const { container } = renderCallout();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the agent chat experience is already enabled', () => {
    mockUseIsAgentBuilderEnabled.mockReturnValue({
      hasAgentBuilderAccess: true,
      isAgentChatExperienceEnabled: true,
    });

    const { container } = renderCallout();

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the user does not have agent builder access', () => {
    mockUseIsAgentBuilderEnabled.mockReturnValue({
      hasAgentBuilderAccess: false,
      isAgentChatExperienceEnabled: false,
    });

    const { container } = renderCallout();

    expect(container).toBeEmptyDOMElement();
  });

  it('calls setDismissed(true) when the dismiss button is clicked', () => {
    renderCallout();

    const dismissButton = screen.getByLabelText('Dismiss this callout');
    fireEvent.click(dismissButton);

    expect(mockSetDismissed).toHaveBeenCalledWith(true);
  });

  it('opens the confirmation modal when "Try AI Agent" is clicked and showAgentBuilderOptInCta is true', () => {
    renderCallout();

    fireEvent.click(screen.getByTestId('defaultExperienceCalloutTryAgentButton'));

    expect(mockOpenAgentBuilderConfirmationModal).toHaveBeenCalled();
  });

  it('renders a link to GenAI Settings when showAgentBuilderOptInCta is false', () => {
    mockUseAgentBuilderOptIn.mockReturnValue({
      showAgentBuilderOptInCta: false,
      isAgentBuilderConfirmationModalOpen: false,
      openAgentBuilderConfirmationModal: mockOpenAgentBuilderConfirmationModal,
      closeAgentBuilderConfirmationModal: mockCloseAgentBuilderConfirmationModal,
      confirmAgentBuilderOptIn: mockConfirmAgentBuilderOptIn,
    });

    renderCallout();

    const button = screen.getByTestId('defaultExperienceCalloutTryAgentButton');
    expect(button).toHaveAttribute('href', '/app/management/ai/genAiSettings');
  });

  it('does not persist dismissal when confirming the opt-in modal', () => {
    mockUseAgentBuilderOptIn.mockReturnValue({
      showAgentBuilderOptInCta: true,
      isAgentBuilderConfirmationModalOpen: true,
      openAgentBuilderConfirmationModal: mockOpenAgentBuilderConfirmationModal,
      closeAgentBuilderConfirmationModal: mockCloseAgentBuilderConfirmationModal,
      confirmAgentBuilderOptIn: mockConfirmAgentBuilderOptIn,
    });

    renderCallout();

    fireEvent.click(screen.getByTestId('confirmButton'));

    expect(mockConfirmAgentBuilderOptIn).toHaveBeenCalled();
    expect(mockSetDismissed).not.toHaveBeenCalled();
  });

  it('renders the confirmation modal when isAgentBuilderConfirmationModalOpen is true', () => {
    mockUseAgentBuilderOptIn.mockReturnValue({
      showAgentBuilderOptInCta: true,
      isAgentBuilderConfirmationModalOpen: true,
      openAgentBuilderConfirmationModal: mockOpenAgentBuilderConfirmationModal,
      closeAgentBuilderConfirmationModal: mockCloseAgentBuilderConfirmationModal,
      confirmAgentBuilderOptIn: mockConfirmAgentBuilderOptIn,
    });

    renderCallout();

    expect(screen.getByTestId('aiAgentConfirmationModal')).toBeInTheDocument();
  });

  it('passes isConversationApp to useAgentBuilderOptIn', () => {
    renderCallout({ isConversationApp: true });

    expect(mockUseAgentBuilderOptIn).toHaveBeenCalledWith({
      navigateFromConversationApp: true,
    });
  });

  it('includes a link to GenAI Settings in the body text', () => {
    renderCallout();

    const link = screen.getByText('GenAI Settings');
    expect(link.closest('a')).toHaveAttribute('href', '/app/management/ai/genAiSettings');
  });

  it('includes a documentation link', () => {
    renderCallout();

    const link = screen.getByText('documentation');
    expect(link.closest('a')).toHaveAttribute('href', 'https://docs.elastic.co/agent-builder');
    expect(link.closest('a')).toHaveAttribute('target', '_blank');
  });
});
