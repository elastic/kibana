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

import { PackRowActions } from './pack_row_actions';
import type { PackSavedObject } from './types';
import type { OsqueryCapabilities } from '../__test_helpers__/create_mock_kibana_services';
import { ROLE_CAPABILITIES } from '../__test_helpers__/create_mock_kibana_services';

const mockPush = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({ push: mockPush }),
}));

const mockUseKibana = jest.fn();

jest.mock('../common/lib/kibana', () => ({
  ...jest.requireActual('../common/lib/kibana'),
  useKibana: () => mockUseKibana(),
}));

const mockCopyMutateAsync = jest.fn().mockResolvedValue(undefined);
const mockDeleteMutateAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('./use_copy_pack', () => ({
  useCopyPack: () => ({ mutateAsync: mockCopyMutateAsync, isLoading: false }),
}));

jest.mock('./use_delete_pack', () => ({
  useDeletePack: () => ({ mutateAsync: mockDeleteMutateAsync, isLoading: false }),
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

const createPack = (
  overrides: Partial<PackSavedObject & { read_only?: boolean }> = {}
): PackSavedObject & { read_only?: boolean } => ({
  saved_object_id: 'test-so-id',
  name: 'test-pack',
  description: 'a test pack',
  queries: {},
  enabled: true,
  created_at: '2025-06-15T10:00:00.000Z',
  created_by: 'elastic',
  updated_at: '2025-06-15T10:00:00.000Z',
  updated_by: 'elastic',
  policy_ids: [],
  references: [],
  ...overrides,
});

const renderComponent = (item: PackSavedObject & { read_only?: boolean }) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <PackRowActions item={item} />
      </IntlProvider>
    </EuiProvider>
  );

const openKebabMenu = () => {
  fireEvent.click(screen.getByLabelText('Actions for test-pack'));
};

describe('PackRowActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupKibana();
  });

  describe('menu items for custom pack with write permissions', () => {
    it('should show Edit, Duplicate, and Delete actions', () => {
      renderComponent(createPack());
      openKebabMenu();

      expect(screen.getByText('Edit pack')).toBeInTheDocument();
      expect(screen.getByText('Duplicate pack')).toBeInTheDocument();
      expect(screen.getByText('Delete pack')).toBeInTheDocument();
    });
  });

  describe('menu items for prebuilt pack with write permissions', () => {
    it('should still show Edit pack but not Delete', () => {
      renderComponent(createPack({ read_only: true }));
      openKebabMenu();

      // Unlike a prebuilt saved query, a prebuilt pack stays editable for a writer
      // (agent policies / shards can be re-targeted), so "Edit pack" is truthful.
      expect(screen.getByText('Edit pack')).toBeInTheDocument();
      expect(screen.queryByText('View pack')).not.toBeInTheDocument();
      expect(screen.getByText('Duplicate pack')).toBeInTheDocument();
      expect(screen.queryByText('Delete pack')).not.toBeInTheDocument();
    });
  });

  describe('menu items without write permissions', () => {
    it('should show View pack (not Edit pack) when user lacks writePacks', () => {
      setupKibana(ROLE_CAPABILITIES.reader);
      renderComponent(createPack());
      openKebabMenu();

      expect(screen.getByText('View pack')).toBeInTheDocument();
      expect(screen.queryByText('Edit pack')).not.toBeInTheDocument();
      expect(screen.queryByText('Duplicate pack')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete pack')).not.toBeInTheDocument();
    });
  });

  describe('Edit action', () => {
    it('should navigate to the pack edit route on click', () => {
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('Edit pack'));

      expect(mockPush).toHaveBeenCalledWith('/packs/test-so-id/edit');
    });

    it('should navigate to the same route from View pack for a reader', () => {
      setupKibana(ROLE_CAPABILITIES.reader);
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('View pack'));

      expect(mockPush).toHaveBeenCalledWith('/packs/test-so-id/edit');
    });
  });

  describe('Duplicate action', () => {
    it('should call copy mutation on click', () => {
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('Duplicate pack'));

      expect(mockCopyMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete action', () => {
    it('should show confirmation modal on click', () => {
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete pack'));

      expect(screen.getByText('Are you sure you want to delete this pack?')).toBeInTheDocument();
    });

    it('should call delete mutation on confirm', async () => {
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete pack'));
      fireEvent.click(screen.getByText('Confirm'));

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledTimes(1);
      });
    });

    it('should close modal on cancel without deleting', () => {
      renderComponent(createPack());
      openKebabMenu();

      fireEvent.click(screen.getByText('Delete pack'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
      expect(
        screen.queryByText('Are you sure you want to delete this pack?')
      ).not.toBeInTheDocument();
    });
  });
});
