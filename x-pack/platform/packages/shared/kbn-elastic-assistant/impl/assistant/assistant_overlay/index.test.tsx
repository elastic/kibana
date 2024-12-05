/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { AssistantOverlay } from '.';
import { TestProviders } from '../../mock/test_providers/test_providers';

const reportAssistantInvoked = jest.fn();
const assistantTelemetry = {
  reportAssistantInvoked,
  reportAssistantMessageSent: () => {},
  reportAssistantQuickPrompt: () => {},
  reportAssistantSettingToggled: () => {},
};
describe('AssistantOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders when isAssistantEnabled prop is true and keyboard shortcut is pressed', () => {
    const { getByTestId } = render(
      <TestProviders providerContext={{ assistantTelemetry }}>
        <AssistantOverlay />
      </TestProviders>
    );
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    const flyout = getByTestId('ai-assistant-flyout');
    expect(flyout).toBeInTheDocument();
  });

  it('flyout closes when close button is clicked', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AssistantOverlay />
      </TestProviders>
    );
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    const closeButton = queryByTestId('euiFlyoutCloseButton');
    if (closeButton) {
      fireEvent.click(closeButton);
    }
    const flyout = queryByTestId('ai-assistant-flyout');
    expect(flyout).not.toBeInTheDocument();
  });

  it('Assistant invoked from shortcut tracking happens on flyout open only (not close)', () => {
    render(
      <TestProviders providerContext={{ assistantTelemetry }}>
        <AssistantOverlay />
      </TestProviders>
    );
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    expect(reportAssistantInvoked).toHaveBeenCalledTimes(1);
    expect(reportAssistantInvoked).toHaveBeenCalledWith({
      invokedBy: 'shortcut',
      conversationId: 'Welcome',
    });
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    expect(reportAssistantInvoked).toHaveBeenCalledTimes(1);
  });

  it('flyout closes when shortcut is pressed and flyout is already open', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AssistantOverlay />
      </TestProviders>
    );
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    fireEvent.keyDown(document, { key: ';', ctrlKey: true });
    const flyout = queryByTestId('ai-assistant-flyout');
    expect(flyout).not.toBeInTheDocument();
  });

  it('flyout does not open when incorrect shortcut is pressed', () => {
    const { queryByTestId } = render(
      <TestProviders>
        <AssistantOverlay />
      </TestProviders>
    );
    fireEvent.keyDown(document, { key: 'a', ctrlKey: true });
    const flyout = queryByTestId('ai-assistant-flyout');
    expect(flyout).not.toBeInTheDocument();
  });
});
