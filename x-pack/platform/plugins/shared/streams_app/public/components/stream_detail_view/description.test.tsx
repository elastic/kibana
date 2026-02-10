/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Streams } from '@kbn/streams-schema';
import { StreamDescription } from './description';

const mockRefresh = jest.fn();
const mockUpdateStream = jest.fn();

jest.mock('@kbn/streams-schema', () => {
  const actual = jest.requireActual('@kbn/streams-schema');
  return {
    ...actual,
    convertGetResponseIntoUpsertRequest: (definition: any) => ({
      dashboards: definition.dashboards ?? [],
      queries: definition.queries ?? [],
      rules: definition.rules ?? [],
      stream: { ...definition.stream },
    }),
  };
});

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiMarkdownEditor: ({
      value,
      onChange,
      readOnly,
      'data-test-subj': dataTestSubj,
    }: {
      value: string;
      onChange: (nextValue: string) => void;
      readOnly?: boolean;
      'data-test-subj'?: string;
    }) => (
      <textarea
        data-test-subj={dataTestSubj}
        value={value}
        disabled={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    ),
  };
});

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => ({
    refresh: mockRefresh,
  }),
}));

jest.mock('../../hooks/use_update_streams', () => ({
  useUpdateStreams: () => mockUpdateStream,
}));

describe('StreamDescription (stream detail header)', () => {
  const createMockDefinition = (
    description?: string,
    canManage: boolean = true
  ): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'logs.test',
        description,
        tags: [],
      },
      privileges: { manage: canManage, simulate: true, read: true },
    } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateStream.mockResolvedValue(undefined);
  });

  it('shows "No description" when empty and read-only', () => {
    render(<StreamDescription definition={createMockDefinition(undefined, false)} />);

    expect(screen.getByText('No description')).toBeInTheDocument();
  });

  it('trims and saves description changes', async () => {
    render(<StreamDescription definition={createMockDefinition('Old description')} />);

    await userEvent.click(screen.getByTestId('streamDescriptionTabEditor'));

    const editor = screen.getByTestId('streamDescriptionMarkdownEditor');
    await userEvent.clear(editor);
    await userEvent.type(editor, '  New description  ');

    await userEvent.click(screen.getByTestId('streamDescriptionSaveButton'));

    await waitFor(() => {
      expect(mockUpdateStream).toHaveBeenCalledTimes(1);
    });

    const request = mockUpdateStream.mock.calls[0][0];
    expect(request.stream.description).toBe('New description');
    expect(mockRefresh).toHaveBeenCalled();
  });

  it('cancels edits and restores the saved description', async () => {
    render(<StreamDescription definition={createMockDefinition('Saved')} />);

    await userEvent.click(screen.getByTestId('streamDescriptionTabEditor'));

    const editor = screen.getByTestId('streamDescriptionMarkdownEditor');
    await userEvent.clear(editor);
    await userEvent.type(editor, 'Changed');

    await userEvent.click(screen.getByTestId('streamDescriptionCancelButton'));

    expect(mockUpdateStream).not.toHaveBeenCalled();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });
});

