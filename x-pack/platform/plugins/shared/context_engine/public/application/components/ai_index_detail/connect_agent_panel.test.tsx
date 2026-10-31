/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { ConnectAgentPanel } from './connect_agent_panel';

const SAMPLE_PROMPT = '# Connect to my AI index\n\nUse these APIs...';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('ConnectAgentPanel', () => {
  beforeAll(() => {
    document.execCommand = jest.fn(() => true);
  });

  it('renders the title and description', () => {
    renderWithProviders(<ConnectAgentPanel prompt={SAMPLE_PROMPT} />);

    expect(screen.getByText('Connect your coding agent')).toBeInTheDocument();
    expect(
      screen.getByText(/Paste this prompt into Claude Code, Cursor, Codex, or another coding agent/)
    ).toBeInTheDocument();
  });

  it('renders the prompt in the code block', () => {
    renderWithProviders(<ConnectAgentPanel prompt={SAMPLE_PROMPT} />);

    const codeBlock = screen.getByTestId('contextOnboardingPromptCodeBlock');
    expect(codeBlock.textContent ?? '').toBe(SAMPLE_PROMPT);
  });

  it('copies the prompt and shows EuiCopy feedback when the copy button is clicked', () => {
    renderWithProviders(<ConnectAgentPanel prompt={SAMPLE_PROMPT} />);

    fireEvent.click(screen.getByTestId('contextOnboardingCopyPromptButton'));

    expect(document.execCommand).toHaveBeenCalledWith('copy');
    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent(
      'Prompt copied to clipboard'
    );
  });
});
