/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { PackRowActions } from './pack_row_actions';
import { downloadPackAsJson } from './form/pack_serializer';
import { useIsExperimentalFeatureEnabled } from '../common/experimental_features_context';
import type { PackSavedObject } from './types';

jest.mock('./form/pack_serializer', () => ({
  downloadPackAsJson: jest.fn(),
}));

jest.mock('../common/experimental_features_context');

const useIsExperimentalFeatureEnabledMock = useIsExperimentalFeatureEnabled as jest.MockedFunction<
  typeof useIsExperimentalFeatureEnabled
>;

jest.mock('react-router-dom', () => ({
  useHistory: () => ({ push: jest.fn() }),
}));

jest.mock('./use_copy_pack', () => ({
  useCopyPack: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('./use_delete_pack', () => ({
  useDeletePack: () => ({ mutateAsync: jest.fn().mockResolvedValue(undefined) }),
}));

// handleExport reports success/failure through the notifications service, so the
// mock must expose toasts (matches the real Kibana core notifications shape).
const mockAddSuccess = jest.fn();
const mockAddDanger = jest.fn();
let mockWritePacksCapability = true;

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: {
      application: { capabilities: { osquery: { writePacks: mockWritePacksCapability } } },
      notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
    },
  }),
}));

const downloadPackAsJsonMock = downloadPackAsJson as jest.MockedFunction<typeof downloadPackAsJson>;

const item = {
  saved_object_id: 'so-1',
  name: 'My Pack',
  queries: { q: { query: 'SELECT 1;', interval: '60' } },
} as unknown as PackSavedObject & { read_only?: boolean };

const renderWithIntl = (ui: React.ReactElement) =>
  render(React.createElement(IntlProvider, { locale: 'en' }, ui));

describe('PackRowActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWritePacksCapability = true;
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  });

  describe('export gating', () => {
    it('exports the row pack when Export pack is clicked (flag on, writePacks true)', () => {
      renderWithIntl(React.createElement(PackRowActions, { item }));

      fireEvent.click(screen.getByLabelText('Actions for My Pack'));
      fireEvent.click(screen.getByText('Export pack'));

      expect(downloadPackAsJsonMock).toHaveBeenCalledTimes(1);
      expect(downloadPackAsJsonMock).toHaveBeenCalledWith(item);
    });

    it('renders and exports even when writePacks is false (export is read-gated, not write-gated)', () => {
      mockWritePacksCapability = false;
      renderWithIntl(React.createElement(PackRowActions, { item }));

      fireEvent.click(screen.getByLabelText('Actions for My Pack'));

      // Export stays available; write-only actions (Duplicate/Delete) do not.
      expect(screen.getByText('Export pack')).toBeInTheDocument();
      expect(screen.queryByText('Duplicate pack')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete pack')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('Export pack'));
      expect(downloadPackAsJsonMock).toHaveBeenCalledTimes(1);
      expect(downloadPackAsJsonMock).toHaveBeenCalledWith(item);
    });

    it('does not render the Export pack action when the flag is off', () => {
      useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
      renderWithIntl(React.createElement(PackRowActions, { item }));

      fireEvent.click(screen.getByLabelText('Actions for My Pack'));

      expect(screen.queryByText('Export pack')).not.toBeInTheDocument();
      expect(downloadPackAsJsonMock).not.toHaveBeenCalled();
    });
  });

  describe('export toasts', () => {
    it('shows a success toast when the export succeeds', () => {
      renderWithIntl(React.createElement(PackRowActions, { item }));

      fireEvent.click(screen.getByLabelText('Actions for My Pack'));
      fireEvent.click(screen.getByText('Export pack'));

      expect(mockAddSuccess).toHaveBeenCalledTimes(1);
      expect(mockAddDanger).not.toHaveBeenCalled();
    });

    it('shows a danger toast and does not throw when the export fails', () => {
      downloadPackAsJsonMock.mockImplementationOnce(() => {
        throw new Error('boom');
      });
      renderWithIntl(React.createElement(PackRowActions, { item }));

      fireEvent.click(screen.getByLabelText('Actions for My Pack'));

      // The click must not throw even though downloadPackAsJson does.
      expect(() => fireEvent.click(screen.getByText('Export pack'))).not.toThrow();

      expect(mockAddDanger).toHaveBeenCalledTimes(1);
      expect(mockAddSuccess).not.toHaveBeenCalled();
    });
  });
});
