/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { StaleAttachmentsPanel } from './stale_attachments_panel';

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en">{ui}</IntlProvider>);

vi.mock('./conversation_input/attachment_pills_row', () => {
  const mocked = {
    AttachmentPillsRow: () => <div data-test-subj="stalePanelPills" />,
  };
  return { ...mocked, default: mocked };
});

describe('StaleAttachmentsPanel', () => {
  it('renders nothing when there are no attachment inputs', () => {
    const { container } = renderWithIntl(
      <StaleAttachmentsPanel attachmentInputs={[]} onAddToInput={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders callout and actions when attachments are stale', () => {
    const onAddToInput = vi.fn();
    const onDismiss = vi.fn();

    renderWithIntl(
      <StaleAttachmentsPanel
        attachmentInputs={[{ id: 'p1', type: 'text', data: { content: 'hi' } }]}
        onAddToInput={onAddToInput}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Some attachments are outdated')).toBeInTheDocument();
    expect(screen.getByTestId('stalePanelPills')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use updated versions' }));
    expect(onAddToInput).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
