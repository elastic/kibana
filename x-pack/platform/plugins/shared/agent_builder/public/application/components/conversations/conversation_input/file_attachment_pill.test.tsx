/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { FileAttachmentPill } from './file_attachment_pill';

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

describe('FileAttachmentPill', () => {
  it.each([
    ['application/pdf', 'invoice.pdf', 'PDF'],
    ['text/markdown', 'notes.md', 'MD'],
    ['text/plain', 'notes.txt', 'TXT'],
  ])('shows the type label of %s', (mimeType, name, label) => {
    render(<FileAttachmentPill attachmentId="d1" name={name} mimeType={mimeType} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('takes the type label from the file name when there is no mime type yet', () => {
    render(<FileAttachmentPill attachmentId="d1" name="notes.md" />);

    expect(screen.getByText('MD')).toBeInTheDocument();
  });

  it('shows no type label when the type is not known', () => {
    render(<FileAttachmentPill attachmentId="d1" name="README" />);

    expect(screen.getByTestId('agentBuilderAttachmentPill-d1')).toBeInTheDocument();
    expect(screen.queryByText(/^[A-Z]{2,3}$/)).not.toBeInTheDocument();
  });

  it('names the file for screen readers', () => {
    render(<FileAttachmentPill attachmentId="d1" name="notes.md" mimeType="text/markdown" />);

    expect(screen.getByRole('img', { name: 'notes.md' })).toBeInTheDocument();
  });

  it('shows a reading status with the loading test id while loading', () => {
    render(<FileAttachmentPill attachmentId="d1" name="notes.md" isLoading />);

    expect(screen.getByTestId('agentBuilderLoadingFilePill-d1')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Reading file...' })).toBeInTheDocument();
  });

  it('calls onRemoveAttachment from the remove button', () => {
    const onRemoveAttachment = jest.fn();
    render(
      <FileAttachmentPill
        attachmentId="d1"
        name="notes.md"
        onRemoveAttachment={onRemoveAttachment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove attachment' }));

    expect(onRemoveAttachment).toHaveBeenCalledTimes(1);
  });

  it('has no remove button when it cannot be removed', () => {
    render(<FileAttachmentPill attachmentId="d1" name="notes.md" />);

    expect(screen.queryByRole('button', { name: 'Remove attachment' })).not.toBeInTheDocument();
  });
});
