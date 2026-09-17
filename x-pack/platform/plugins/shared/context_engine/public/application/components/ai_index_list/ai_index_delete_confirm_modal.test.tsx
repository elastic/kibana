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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { AiIndexDeleteConfirmModal } from './ai_index_delete_confirm_modal';

const mockDeleteAiIndex = jest.fn();

jest.mock('../../hooks/use_delete_ai_index', () => ({
  useDeleteAiIndex: () => ({
    deleteAiIndex: mockDeleteAiIndex,
    isDeleting: false,
  }),
}));

const aiIndex: AiIndexHttpItem = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [{ type: 'workflow', value: 'wf-1' }],
  sources: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const createServices = () => {
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    workflowsManagement: { deleteWorkflow: true },
  };
  return services;
};

const renderModal = (
  overrides: Partial<AiIndexHttpItem> = {},
  {
    onClose = jest.fn(),
    onSuccess = jest.fn(),
  }: { onClose?: jest.Mock; onSuccess?: jest.Mock } = {}
) => {
  const services = createServices();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <AiIndexDeleteConfirmModal
              aiIndex={{ ...aiIndex, ...overrides }}
              onClose={onClose}
              onSuccess={onSuccess}
            />
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { services, onClose, onSuccess };
};

describe('AiIndexDeleteConfirmModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows success toast and calls onSuccess/onClose on clean delete', async () => {
    mockDeleteAiIndex.mockResolvedValue({ acknowledged: true, errors: [] });
    const { services, onClose, onSuccess } = renderModal();

    fireEvent.click(screen.getByText('Delete AI index'));

    await waitFor(() => {
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.stringContaining('"my-ai-index" deleted')
      );
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a warning toast per error on partial failure and still closes', async () => {
    mockDeleteAiIndex.mockResolvedValue({
      acknowledged: true,
      errors: ['Failed to remove KI', 'Failed to remove automation'],
    });
    const { services, onClose, onSuccess } = renderModal();

    fireEvent.click(screen.getByText('Delete AI index'));

    await waitFor(() => {
      expect(services.notifications.toasts.addWarning).toHaveBeenCalledTimes(2);
    });
    expect(services.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Failed to remove KI' })
    );
    expect(services.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Failed to remove automation' })
    );
    expect(onSuccess).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an inline error and does not close when deleteAiIndex throws', async () => {
    mockDeleteAiIndex.mockRejectedValue(new Error('Server error'));
    const { onClose, onSuccess } = renderModal();

    fireEvent.click(screen.getByText('Delete AI index'));

    expect(await screen.findByTestId('contextAiIndexDeleteError')).toHaveTextContent(
      'Server error'
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables the automations checkbox when there are no automations', () => {
    renderModal({ automations: [] });

    expect(screen.getByTestId('contextAiIndexDeleteAutomationsCheckbox')).toBeDisabled();
  });

  it('enables the automations checkbox when automations exist', () => {
    renderModal({ automations: [{ type: 'workflow', value: 'wf-1' }] });

    expect(screen.getByTestId('contextAiIndexDeleteAutomationsCheckbox')).toBeEnabled();
  });

  it('does not request automation deletion when the user lacks deleteWorkflow capability', async () => {
    mockDeleteAiIndex.mockResolvedValue({ acknowledged: true, errors: [] });
    const onClose = jest.fn();
    const services = coreMock.createStart();
    services.application.capabilities = {
      ...services.application.capabilities,
      workflowsManagement: { deleteWorkflow: false },
    };
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>
              <AiIndexDeleteConfirmModal
                aiIndex={{ ...aiIndex, automations: [{ type: 'workflow', value: 'wf-1' }] }}
                onClose={onClose}
                onSuccess={jest.fn()}
              />
            </QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    expect(screen.getByTestId('contextAiIndexDeleteAutomationsCheckbox')).toBeDisabled();

    fireEvent.click(screen.getByText('Delete AI index'));

    await waitFor(() => {
      expect(mockDeleteAiIndex).toHaveBeenCalledWith({
        aiIndexId: 'my-ai-index',
        deleteKnowledgeIndicators: true,
        deleteAutomations: false,
      });
    });
  });
});
