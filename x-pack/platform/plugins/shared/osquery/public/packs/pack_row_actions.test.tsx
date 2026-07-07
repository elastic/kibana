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

jest.mock('../common/lib/kibana', () => ({
  useKibana: () => ({
    services: { application: { capabilities: { osquery: { writePacks: true } } } },
  }),
}));

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
    useIsExperimentalFeatureEnabledMock.mockReturnValue(true);
  });

  it('exports the row pack when Export pack is clicked (flag on)', () => {
    renderWithIntl(React.createElement(PackRowActions, { item }));

    fireEvent.click(screen.getByLabelText('Actions for My Pack'));
    fireEvent.click(screen.getByText('Export pack'));

    expect(downloadPackAsJson).toHaveBeenCalledTimes(1);
    expect(downloadPackAsJson).toHaveBeenCalledWith(item);
  });

  it('does not render the Export pack action when the flag is off', () => {
    useIsExperimentalFeatureEnabledMock.mockReturnValue(false);
    renderWithIntl(React.createElement(PackRowActions, { item }));

    fireEvent.click(screen.getByLabelText('Actions for My Pack'));

    expect(screen.queryByText('Export pack')).not.toBeInTheDocument();
    expect(downloadPackAsJson).not.toHaveBeenCalled();
  });
});
