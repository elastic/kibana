/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { StreamDeleteModal } from '.';
import { useKibana } from '../../hooks/use_kibana';

jest.mock('../../hooks/use_kibana');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const renderWithProviders = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('StreamDeleteModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      core: {
        notifications: {
          toasts: {
            addSuccess: jest.fn(),
            addError: jest.fn(),
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  const defaultProps = {
    onClose: jest.fn(),
    onDelete: jest.fn(),
    onCancel: jest.fn(),
    name: 'logs.ecs.query-delete-test',
  };

  it('shows informational copy for Query Streams', () => {
    renderWithProviders(<StreamDeleteModal {...defaultProps} variant="query" />);

    expect(
      screen.getByText(
        'Are you sure you want to delete the Query Stream logs.ecs.query-delete-test?'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Query Streams are read-only. Deleting this Query Stream only removes its saved configuration.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Query Streams read data from CPS-connected source streams. Deleting logs.ecs.query-delete-test removes its saved query string and stream configuration, but does not delete indexed data.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/permanently deletes the .* stream and all its contents/i)
    ).not.toBeInTheDocument();
  });

  it('keeps destructive copy for regular streams', () => {
    renderWithProviders(<StreamDeleteModal {...defaultProps} />);

    expect(
      screen.getByText('Are you sure you want to delete logs.ecs.query-delete-test ?')
    ).toBeInTheDocument();
    expect(screen.getByTestId('streamsAppDeleteStreamModalCallout')).toHaveTextContent(
      'This action cannot be undone and permanently deletes the logs.ecs.query-delete-test stream and all its contents. This action cannot be undone.'
    );
  });
});
