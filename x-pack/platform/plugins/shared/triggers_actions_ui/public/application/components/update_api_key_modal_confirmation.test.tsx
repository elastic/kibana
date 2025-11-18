/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { IToasts } from '@kbn/core/public';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UpdateApiKeyModalConfirmation } from './update_api_key_modal_confirmation';
import { useKibana } from '../../common/lib/kibana';

const Providers = ({ children }: { children: any }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const renderWithProviders = (ui: any) => {
  return render(ui, { wrapper: Providers });
};

jest.mock('../../common/lib/kibana');
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

describe('Update Api Key', () => {
  const onCancel = jest.fn();
  const apiUpdateApiKeyCall = jest.fn();
  const setIsLoadingState = jest.fn();
  const onUpdated = jest.fn();
  const onSearchPopulate = jest.fn();

  const addSuccess = jest.fn();
  const addError = jest.fn();

  beforeAll(() => {
    useKibanaMock().services.notifications.toasts = {
      addSuccess,
      addError,
    } as unknown as IToasts;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Render modal updates Api Key', async () => {
    renderWithProviders(
      <UpdateApiKeyModalConfirmation
        onCancel={onCancel}
        idsToUpdate={['2']}
        apiUpdateApiKeyCall={apiUpdateApiKeyCall}
        setIsLoadingState={setIsLoadingState}
        onUpdated={onUpdated}
        onSearchPopulate={onSearchPopulate}
      />
    );

    expect(
      await screen.findByText('You will not be able to recover the old API key')
    ).toBeInTheDocument();
  });

  it('Cancel modal updates Api Key', async () => {
    renderWithProviders(
      <UpdateApiKeyModalConfirmation
        onCancel={onCancel}
        idsToUpdate={['2']}
        apiUpdateApiKeyCall={apiUpdateApiKeyCall}
        setIsLoadingState={setIsLoadingState}
        onUpdated={onUpdated}
        onSearchPopulate={onSearchPopulate}
      />
    );

    fireEvent.click(await screen.findByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('Update an Api Key', async () => {
    apiUpdateApiKeyCall.mockResolvedValue({});
    renderWithProviders(
      <UpdateApiKeyModalConfirmation
        onCancel={onCancel}
        idsToUpdate={['2']}
        apiUpdateApiKeyCall={apiUpdateApiKeyCall}
        setIsLoadingState={setIsLoadingState}
        onUpdated={onUpdated}
        onSearchPopulate={onSearchPopulate}
      />
    );

    fireEvent.click(await screen.findByText('Update'));
    expect(setIsLoadingState).toBeCalledTimes(1);
    expect(apiUpdateApiKeyCall).toHaveBeenLastCalledWith(expect.objectContaining({ ids: ['2'] }));
    await waitFor(() => {
      expect(setIsLoadingState).toBeCalledTimes(2);
      expect(onUpdated).toHaveBeenCalled();
    });
  });

  it('Failed to update an Api Key', async () => {
    apiUpdateApiKeyCall.mockRejectedValue(500);
    renderWithProviders(
      <UpdateApiKeyModalConfirmation
        onCancel={onCancel}
        idsToUpdate={['2']}
        apiUpdateApiKeyCall={apiUpdateApiKeyCall}
        setIsLoadingState={setIsLoadingState}
        onUpdated={onUpdated}
        onSearchPopulate={onSearchPopulate}
      />
    );

    fireEvent.click(await screen.findByText('Update'));
    expect(setIsLoadingState).toBeCalledTimes(1);
    expect(apiUpdateApiKeyCall).toHaveBeenLastCalledWith(expect.objectContaining({ ids: ['2'] }));
    await waitFor(() => {
      expect(setIsLoadingState).toBeCalledTimes(2);
      expect(addError).toHaveBeenCalled();
      expect(addError.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          500,
          Object {
            "title": "Failed to update the API key",
          },
        ]
      `);
    });
  });
});
