/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { DeleteServiceAccountModal } from './delete_service_account_modal';
import type { ServiceAccountBoundWorkload } from '../../service_accounts';

const serviceAccount = { id: 'kibana/workflow-runner', name: 'workflow-runner' };

const workload = (workloadId: string): ServiceAccountBoundWorkload => ({
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId,
  displayName: `Workflow ${workloadId}`,
});

/** An `IHttpFetchError` as Core's HTTP client rejects with it. */
const httpError = (status: number, body: object) =>
  Object.assign(new Error('Request failed'), {
    name: 'HttpFetchError',
    request: {},
    response: { status },
    body,
  });

describe('DeleteServiceAccountModal', () => {
  const renderModal = ({
    listWorkloads = jest.fn().mockResolvedValue({ workloads: [] }),
    deleteAccount = jest.fn().mockResolvedValue({ warnings: [] }),
  }: { listWorkloads?: jest.Mock; deleteAccount?: jest.Mock } = {}) => {
    const onClose = jest.fn();
    const onDeleted = jest.fn();
    const onError = jest.fn();

    renderWithI18n(
      <EuiProvider>
        <DeleteServiceAccountModal
          serviceAccount={serviceAccount}
          serviceAccountsAPIClient={{ listWorkloads, delete: deleteAccount }}
          onClose={onClose}
          onDeleted={onDeleted}
          onError={onError}
        />
      </EuiProvider>
    );

    return { listWorkloads, deleteAccount, onClose, onDeleted, onError };
  };

  it('asks to confirm an unbound account, then deletes it', async () => {
    const deleteAccount = jest.fn().mockResolvedValue({ warnings: ['a token was left behind'] });
    const { listWorkloads, onDeleted } = renderModal({ deleteAccount });

    const modal = await screen.findByTestId('serviceAccountDeleteConfirmModal');
    expect(listWorkloads).toHaveBeenCalledWith(serviceAccount.id);
    expect(modal).toHaveTextContent('Delete "workflow-runner"?');
    expect(within(modal).getByTestId('confirmModalConfirmButton')).toHaveTextContent(
      'Delete account'
    );

    fireEvent.click(within(modal).getByTestId('confirmModalConfirmButton'));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(['a token was left behind']));
    expect(deleteAccount).toHaveBeenCalledWith(serviceAccount.id);
  });

  it('closes without deleting when the user cancels', async () => {
    const { deleteAccount, onClose } = renderModal();

    fireEvent.click(await screen.findByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('lists the bound workloads instead, and only offers to close', async () => {
    const workloads = Array.from({ length: 7 }, (_, index) => workload(`w-${index}`));
    const { deleteAccount, onClose } = renderModal({
      listWorkloads: jest.fn().mockResolvedValue({ workloads }),
    });

    const modal = await screen.findByTestId('serviceAccountBoundModal');
    expect(modal).toHaveTextContent('Unable to delete "workflow-runner"');
    expect(modal).toHaveTextContent('This service account is bound to 7 workloads.');
    expect(screen.queryByTestId('serviceAccountDeleteConfirmModal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('confirmModalConfirmButton')).not.toBeInTheDocument();

    // Paginated at five per page.
    const table = within(modal).getByTestId('serviceAccountBoundWorkloadsTable');
    expect(within(table).getByText('Workflow w-0')).toBeVisible();
    expect(within(table).getAllByText('workflow')).toHaveLength(5);
    expect(within(table).queryByText('Workflow w-5')).not.toBeInTheDocument();

    fireEvent.click(within(modal).getByTestId('serviceAccountBoundModalClose'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('lists the same workload id twice when it is bound in two spaces', async () => {
    renderModal({
      listWorkloads: jest.fn().mockResolvedValue({ workloads: [workload('w-1'), workload('w-1')] }),
    });

    const table = await screen.findByTestId('serviceAccountBoundWorkloadsTable');
    expect(within(table).getAllByText('Workflow w-1')).toHaveLength(2);
  });

  it('switches to the bound workloads when the delete is refused with a 409', async () => {
    const bound = workload('bound-later');
    const { onDeleted, onError } = renderModal({
      deleteAccount: jest
        .fn()
        .mockRejectedValue(httpError(409, { attributes: { workloads: [bound] } })),
    });

    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    const modal = await screen.findByTestId('serviceAccountBoundModal');
    expect(modal).toHaveTextContent('This service account is bound to 1 workload.');
    expect(within(modal).getByText('Workflow bound-later')).toBeVisible();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports any other delete failure and stays open for another try', async () => {
    const error = httpError(500, { message: 'Internal Server Error' });
    const { onError, onClose } = renderModal({
      deleteAccount: jest.fn().mockRejectedValue(error),
    });

    fireEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(error, 'Unable to delete "workflow-runner"')
    );
    expect(screen.getByTestId('serviceAccountDeleteConfirmModal')).toBeVisible();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('reports a failure to check the workloads and closes', async () => {
    const error = new Error('Network failure');
    const { deleteAccount, onError, onClose } = renderModal({
      listWorkloads: jest.fn().mockRejectedValue(error),
    });

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      error,
      'Unable to check the workloads of "workflow-runner"'
    );
    expect(screen.queryByTestId('serviceAccountDeleteConfirmModal')).not.toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();
  });
});
