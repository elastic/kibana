/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResponseFlyout } from './tool_response_flyout';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

const makeStep = () =>
  createToolCallStep({
    tool_call_id: 'c1',
    tool_id: 'my_tool',
    params: {},
    results: [{ tool_result_id: 'r1', type: ToolResultType.other, data: {} }],
  });

describe('ToolResponseFlyout', () => {
  it('renders without a Back button when onBack is not provided', () => {
    renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={jest.fn()} />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('renders a Back button when onBack is provided', () => {
    renderWithProviders(
      <ToolResponseFlyout step={makeStep()} onClose={jest.fn()} onBack={jest.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('calls onBack when Back is clicked, not onClose', async () => {
    const user = userEvent.setup();
    const onBack = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={onClose} onBack={onBack} />);
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the flyout close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderWithProviders(<ToolResponseFlyout step={makeStep()} onClose={onClose} />);
    await user.click(screen.getByTestId('euiFlyoutCloseButton'));
    expect(onClose).toHaveBeenCalled();
  });
});
