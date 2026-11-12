/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { AttachmentPill } from './attachment_pill';

const mockGetAttachmentUiDefinition = jest.fn();
jest.mock('../../../hooks/use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getAttachmentUiDefinition: mockGetAttachmentUiDefinition },
  }),
}));

const render = (ui: React.ReactElement) => rtlRender(<EuiThemeProvider>{ui}</EuiThemeProvider>);

describe('AttachmentPill', () => {
  beforeEach(() => {
    mockGetAttachmentUiDefinition.mockReset();
    mockGetAttachmentUiDefinition.mockReturnValue({
      getLabel: ({ description }: { description?: string }) => description ?? 'Document',
      getIcon: () => 'document',
    });
  });

  it('shows a pending binary file as a tile with the type from its file name', () => {
    render(
      <AttachmentPill
        attachment={{ id: 'd1', type: 'binary', data: {}, description: 'notes.md' }}
      />
    );

    expect(screen.getByTestId('agentBuilderAttachmentPill-d1')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
  });

  it('prefers the stored mime type of a binary file', () => {
    render(
      <AttachmentPill
        attachment={{
          id: 'd1',
          type: 'binary',
          data: { mime_type: 'application/pdf' },
          description: 'notes.md',
        }}
      />
    );

    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows a loading binary file as a tile with the reading status', () => {
    render(
      <AttachmentPill
        attachment={{ id: 'd1', type: 'binary', data: {}, description: 'invoice.pdf' }}
        isLoading
      />
    );

    expect(screen.getByTestId('agentBuilderLoadingFilePill-d1')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('shows a text attachment with a name as a file tile with the type from the name', () => {
    render(
      <AttachmentPill
        attachment={{ id: 't1', type: 'text', data: { content: '# Hi', name: 'notes.md' } }}
      />
    );

    expect(screen.getByTestId('agentBuilderAttachmentPill-t1')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByLabelText('notes.md')).toBeInTheDocument();
  });

  it('shows a loading text file as a tile with the reading status', () => {
    render(
      <AttachmentPill
        attachment={{ id: 't1', type: 'text', data: { content: '', name: 'data.csv' } }}
        isLoading
      />
    );

    expect(screen.getByTestId('agentBuilderLoadingFilePill-t1')).toBeInTheDocument();
    expect(screen.getByText('CSV')).toBeInTheDocument();
  });

  it('keeps the name panel for a text attachment without a name', () => {
    render(
      <AttachmentPill
        attachment={{ id: 't1', type: 'text', data: { content: 'x' }, description: 'A note' }}
      />
    );

    expect(screen.getByText('A note')).toBeInTheDocument();
    expect(screen.queryByText('MD')).not.toBeInTheDocument();
  });

  it('keeps the name panel for other attachment types', () => {
    render(
      <AttachmentPill attachment={{ id: 'n1', type: 'text', data: {}, description: 'A note' }} />
    );

    expect(screen.getByText('A note')).toBeInTheDocument();
  });
});
