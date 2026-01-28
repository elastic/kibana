/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { Streams } from '@kbn/streams-schema';
import { StreamTitle } from './title';

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

describe('StreamTitle', () => {
  const createMockDefinition = (title?: string): Streams.ingest.all.GetResponse =>
    ({
      stream: {
        name: 'logs.test',
        description: 'Test description',
        title,
      },
      privileges: { manage: true, simulate: true, read: true },
    } as unknown as Streams.ingest.all.GetResponse);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateStream.mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('renders with placeholder when no title is set', () => {
      render(<StreamTitle definition={createMockDefinition()} />);

      expect(screen.getByTestId('streamTitleEdit')).toBeInTheDocument();
      expect(screen.getByText('Add a title')).toBeInTheDocument();
    });

    it('renders with existing title', () => {
      render(<StreamTitle definition={createMockDefinition('My Stream Title')} />);

      expect(screen.getByTestId('streamTitleEdit')).toBeInTheDocument();
      expect(screen.getByText('My Stream Title')).toBeInTheDocument();
    });

    it('renders as clickable element', () => {
      render(<StreamTitle definition={createMockDefinition('My Title')} />);

      const editElement = screen.getByTestId('streamTitleEdit');
      expect(editElement).toBeInTheDocument();
      expect(editElement.querySelector('button')).toBeInTheDocument();
    });
  });

  describe('read-only mode', () => {
    it('renders when user lacks manage privileges', () => {
      const definition = createMockDefinition('Read Only Title');
      definition.privileges.manage = false;

      render(<StreamTitle definition={definition} />);

      expect(screen.getByTestId('streamTitleEdit')).toBeInTheDocument();
      expect(screen.getByText('Read Only Title')).toBeInTheDocument();
    });

    it('shows placeholder when no title and user lacks manage privileges', () => {
      const definition = createMockDefinition();
      definition.privileges.manage = false;

      render(<StreamTitle definition={definition} />);

      expect(screen.getByTestId('streamTitleEdit')).toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('uses title from definition as initial value', () => {
      render(<StreamTitle definition={createMockDefinition('Initial Title')} />);

      expect(screen.getByText('Initial Title')).toBeInTheDocument();
    });

    it('uses empty string when title is undefined', () => {
      render(<StreamTitle definition={createMockDefinition(undefined)} />);

      expect(screen.getByText('Add a title')).toBeInTheDocument();
    });
  });
});
