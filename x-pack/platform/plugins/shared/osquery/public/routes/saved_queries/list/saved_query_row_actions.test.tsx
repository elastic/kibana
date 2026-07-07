/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';

import { SavedQueryRowActions } from './saved_query_row_actions';
import type { SavedQuerySO } from '.';
import type { OsqueryCapabilities } from '../../../__test_helpers__/create_mock_kibana_services';
import { ROLE_CAPABILITIES } from '../../../__test_helpers__/create_mock_kibana_services';

const mockPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

const mockUseKibana = jest.fn();

jest.mock('../../../common/lib/kibana', () => ({
  ...jest.requireActual('../../../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const mockCopyMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('../../../saved_queries/use_copy_saved_query', () => ({
  useCopySavedQuery: () => ({ mutateAsync: mockCopyMutateAsync, isLoading: false }),
}));

jest.mock('../../../saved_queries/use_delete_saved_query', () => ({
  useDeleteSavedQuery: () => ({ mutateAsync: mockDeleteMutateAsync, isLoading: false }),
}));

const setupKibana = (capabilities: Partial<OsqueryCapabilities> = {}) => {
  mockUseKibana.mockReturnValue({
    services: {
      application: {
        capabilities: {
          osquery: { ...ROLE_CAPABILITIES.admin, ...capabilities },
        },
      },
    },
  });
};

const createSavedQuery = (overrides: Partial<SavedQuerySO> = {}): SavedQuerySO => ({
  id: 'test-query',
  name: 'test-query',
  saved_object_id: 'test-so-id',
  query: 'SELECT * FROM uptime',
  ecs_mapping: {},
  updated_at: '2025-06-15T10:00:00.000Z',
  ...overrides,
});

const renderComponent = (item: SavedQuerySO) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <SavedQueryRowActions item={item} />
      </IntlProvider>
    </EuiProvider>
  );

const openKebabMenu = () => {
  const kebabButton = screen.getByLabelText(`Actions for test-query`);
  fireEvent.click(kebabButton);
};

describe('SavedQueryRowActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('menu items for custom query with write permissions', () => {
    it('should show Edit, Duplicate, and Delete actions', () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      expect(screen.getByText('Edit query')).toBeInTheDocument();
      expect(screen.getByText('Duplicate query')).toBeInTheDocument();
      expect(screen.getByText('Delete query')).toBeInTheDocument();
    });
  });

  describe('menu items for prebuilt query with write permissions', () => {
    it('should show Edit and Duplicate but NOT Delete for prebuilt query', () => {
      renderComponent(createSavedQuery({ prebuilt: true }));
      openKebabMenu();

      expect(screen.getByText('Edit query')).toBeInTheDocument();
      expect(screen.getByText('Duplicate query')).toBeInTheDocument();
      expect(screen.queryByText('Delete query')).not.toBeInTheDocument();
    });
  });

  describe('menu items without write permissions', () => {
    it('should only show Edit when user lacks writeSavedQueries', () => {
      setupKibana(ROLE_CAPABILITIES.reader);
      renderComponent(createSavedQuery());
      openKebabMenu();

      expect(screen.getByText('Edit query')).toBeInTheDocument();
      expect(screen.queryByText('Duplicate query')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete query')).not.toBeInTheDocument();
    });
  });

  describe('Edit action', () => {
    it('should navigate to edit page on click', () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      fireEvent.click(screen.getByText('Edit query'));

      expect(mockPush).toHaveBeenCalledWith('/saved_queries/test-so-id');
    });
  });

  describe('Duplicate action', () => {
    it('should call copy mutation on click', () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      fireEvent.click(screen.getByText('Duplicate query'));

      expect(mockCopyMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete action', () => {
    it('should show confirmation modal on click', () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete query'));

      expect(screen.getByText('Are you sure you want to delete this query?')).toBeInTheDocument();
    });

    it('should call delete mutation on confirm', async () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete query'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('should close modal on cancel without deleting', () => {
      renderComponent(createSavedQuery());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete query'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Are you sure you want to delete this query?')
      ).not.toBeInTheDocument();
    });
  });
});
