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
import { StreamTags } from './tags';

const mockRefresh = jest.fn();
const mockUpdateStream = jest.fn();

jest.mock('../../hooks/use_stream_detail', () => ({
  useStreamDetail: () => ({
    refresh: mockRefresh,
  }),
}));

jest.mock('../../hooks/use_update_streams', () => ({
  useUpdateStreams: () => mockUpdateStream,
}));

describe('StreamTags', () => {
  const createMockDefinition = (tags?: string[]): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'logs.test',
        description: 'Test description',
        tags,
      },
      privileges: { manage: true, simulate: true, read: true },
    } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateStream.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('shows "No tags" when no tags exist and user cannot manage', () => {
      const definition = createMockDefinition();
      definition.privileges.manage = false;

      render(<StreamTags definition={definition} />);

      expect(screen.getByTestId('streamTagsEmpty')).toBeInTheDocument();
      expect(screen.getByText('No tags')).toBeInTheDocument();
    });

    it('shows add button when user has manage privileges but no tags', () => {
      render(<StreamTags definition={createMockDefinition()} />);

      expect(screen.getByTestId('streamTagsAddButton')).toBeInTheDocument();
    });

    it('renders existing tags as badges', () => {
      render(<StreamTags definition={createMockDefinition(['nginx', 'production', 'logs'])} />);

      expect(screen.getByTestId('streamTag-nginx')).toBeInTheDocument();
      expect(screen.getByTestId('streamTag-production')).toBeInTheDocument();
      expect(screen.getByTestId('streamTag-logs')).toBeInTheDocument();
    });
  });

  describe('adding tags', () => {
    it('opens popover when clicking add button', async () => {
      render(<StreamTags definition={createMockDefinition()} />);

      const addButton = screen.getByTestId('streamTagsAddButton');
      await userEvent.click(addButton);

      expect(screen.getByTestId('streamTagsPopover')).toBeInTheDocument();
      expect(screen.getByTestId('streamTagsComboBox')).toBeInTheDocument();
    });

    it('creates new tag when typing and pressing Enter', async () => {
      render(<StreamTags definition={createMockDefinition()} />);

      const addButton = screen.getByTestId('streamTagsAddButton');
      await userEvent.click(addButton);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, 'new-tag{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('streamTag-new-tag')).toBeInTheDocument();
      });
    });

    it('trims whitespace from new tags', async () => {
      render(<StreamTags definition={createMockDefinition()} />);

      const addButton = screen.getByTestId('streamTagsAddButton');
      await userEvent.click(addButton);

      const input = screen.getByRole('combobox');
      await userEvent.type(input, '  trimmed-tag  {Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('streamTag-trimmed-tag')).toBeInTheDocument();
      });
    });
  });

  describe('removing tags', () => {
    it('shows remove button on tags when user has manage privileges', () => {
      render(<StreamTags definition={createMockDefinition(['nginx'])} />);

      const badge = screen.getByTestId('streamTag-nginx');
      const removeButton = badge.querySelector('[data-euiicon-type="cross"]');
      expect(removeButton).toBeInTheDocument();
    });

    it('does not show remove button when user lacks manage privileges', () => {
      const definition = createMockDefinition(['nginx']);
      definition.privileges.manage = false;

      render(<StreamTags definition={definition} />);

      const badge = screen.getByTestId('streamTag-nginx');
      const removeButton = badge.querySelector('[data-euiicon-type="cross"]');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('has a clickable remove button on each tag', () => {
      render(<StreamTags definition={createMockDefinition(['nginx', 'production'])} />);

      const nginxBadge = screen.getByTestId('streamTag-nginx');
      const removeButton = nginxBadge.querySelector('button');

      expect(removeButton).toBeInTheDocument();
      expect(removeButton).toHaveAttribute('aria-label', 'Remove tag nginx');
    });
  });

  describe('read-only mode', () => {
    it('does not show add button when user lacks manage privileges', () => {
      const definition = createMockDefinition(['nginx']);
      definition.privileges.manage = false;

      render(<StreamTags definition={definition} />);

      expect(screen.queryByTestId('streamTagsAddButton')).not.toBeInTheDocument();
    });

    it('displays tags without edit capability when user lacks manage privileges', () => {
      const definition = createMockDefinition(['nginx', 'production']);
      definition.privileges.manage = false;

      render(<StreamTags definition={definition} />);

      expect(screen.getByTestId('streamTag-nginx')).toBeInTheDocument();
      expect(screen.getByTestId('streamTag-production')).toBeInTheDocument();
    });
  });
});
