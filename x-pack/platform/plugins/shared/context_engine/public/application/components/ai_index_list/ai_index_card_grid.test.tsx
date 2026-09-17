/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AiIndexCardGrid } from './ai_index_card_grid';

const mockRefetch = jest.fn();

jest.mock('@kbn/content-list-provider', () => ({
  ...jest.requireActual('@kbn/content-list-provider'),
  useContentListPhase: () => 'populated',
  useContentListItems: () => ({
    items: [
      {
        id: 'my-ai-index',
        type: 'data_stream',
        managed: false,
        updatedAt: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        references: [],
        attributes: { title: 'my-ai-index' },
        aiIndex: {
          id: 'my-ai-index',
          managed: false,
          dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
          automations: [],
          sources: [],
          date_created: '2026-01-01T00:00:00.000Z',
          date_modified: '2026-01-01T00:00:00.000Z',
        },
      },
    ],
    totalItems: 1,
    hasNoResults: false,
    refetch: mockRefetch,
  }),
  useContentListSearch: () => ({ setQueryFromText: jest.fn() }),
}));

jest.mock('./ai_index_delete_confirm_modal', () => ({
  AiIndexDeleteConfirmModal: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      trigger-on-success
    </button>
  ),
}));

const renderGrid = () => {
  const services = coreMock.createStart();
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <AiIndexCardGrid />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { services };
};

describe('AiIndexCardGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  it('toasts when the list cannot be refreshed after delete', async () => {
    const refetchError = new Error('refetch failed');
    mockRefetch.mockRejectedValue(refetchError);
    const { services } = renderGrid();

    fireEvent.click(screen.getByTestId('contextAiIndexCardActionsButton'));
    fireEvent.click(screen.getByTestId('contextAiIndexCardDeleteAction'));
    fireEvent.click(screen.getByText('trigger-on-success'));

    await waitFor(() => {
      expect(services.notifications.toasts.addError).toHaveBeenCalledWith(
        refetchError,
        expect.objectContaining({
          title: expect.stringContaining('the list could not be refreshed'),
        })
      );
    });
  });
});
