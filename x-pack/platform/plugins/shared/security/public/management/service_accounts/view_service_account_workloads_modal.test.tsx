/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import React from 'react';

import type { ServiceAccountBoundWorkload } from '@kbn/core-security-common';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ServiceAccountWorkloadsModal } from './view_service_account_workloads_modal';
import type { ListServiceAccountWorkloadsResponse } from '../../service_accounts';

const serviceAccount = { id: 'kibana/workflow-runner', name: 'workflow-runner' };

const workload = (workloadId: string): ServiceAccountBoundWorkload => ({
  pluginId: 'workflows',
  workloadType: 'workflow',
  workloadId,
  displayName: `Workflow ${workloadId}`,
  typeName: 'Workflow',
  href: `/app/workflows/${workloadId}`,
});

describe('ServiceAccountWorkloadsModal', () => {
  jest.setTimeout(30_000);

  const renderModal = (listWorkloads: jest.Mock) => {
    const onClose = jest.fn();
    const onError = jest.fn();

    const { unmount } = renderWithI18n(
      <EuiProvider>
        <ServiceAccountWorkloadsModal
          serviceAccount={serviceAccount}
          serviceAccountsAPIClient={{ listWorkloads }}
          onClose={onClose}
          onError={onError}
        />
      </EuiProvider>
    );

    return { onClose, onError, unmount };
  };

  it('opens at once with a loading state, then lists the bound workloads', async () => {
    let resolve: (response: ListServiceAccountWorkloadsResponse) => void = () => {};
    const listWorkloads = jest.fn().mockReturnValue(
      new Promise<ListServiceAccountWorkloadsResponse>((onResolve) => {
        resolve = onResolve;
      })
    );
    renderModal(listWorkloads);

    const modal = screen.getByTestId('serviceAccountWorkloadsModal');
    expect(modal).toHaveTextContent('Workloads bound to "workflow-runner"');
    expect(within(modal).getByTestId('serviceAccountWorkloadsLoading')).toBeVisible();
    expect(listWorkloads).toHaveBeenCalledWith(serviceAccount.id);

    await act(async () => resolve({ workloads: [workload('w-1')] }));

    const table = within(modal).getByTestId('serviceAccountBoundWorkloadsTable');
    expect(within(table).getByTestId('serviceAccountBoundWorkloadLink')).toHaveAttribute(
      'href',
      '/app/workflows/w-1'
    );
    expect(within(table).getByText('Workflow')).toBeVisible();
    expect(screen.queryByTestId('serviceAccountWorkloadsLoading')).not.toBeInTheDocument();
    // Viewing is not deleting, so none of the delete wording or actions show up.
    expect(modal).not.toHaveTextContent('Removing it means');
    expect(screen.queryByTestId('serviceAccountForceDeleteButton')).not.toBeInTheDocument();
  });

  it('says so when the workloads were unbound since the table was loaded', async () => {
    renderModal(jest.fn().mockResolvedValue({ workloads: [] }));

    expect(await screen.findByTestId('serviceAccountBoundWorkloadsEmpty')).toHaveTextContent(
      'No workloads are bound to this account.'
    );
  });

  it('closes from its Close button', async () => {
    const { onClose } = renderModal(jest.fn().mockResolvedValue({ workloads: [workload('w-1')] }));

    await screen.findByTestId('serviceAccountBoundWorkloadsTable');
    fireEvent.click(screen.getByTestId('serviceAccountWorkloadsModalClose'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reports a failed load and closes', async () => {
    const error = new Error('Network failure');
    const { onClose, onError } = renderModal(jest.fn().mockRejectedValue(error));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(
      error,
      'Unable to load the workloads of "workflow-runner"'
    );
  });

  it('ignores an answer that arrives after it closed', async () => {
    let reject: (error: Error) => void = () => {};
    const listWorkloads = jest.fn().mockReturnValue(
      new Promise((_, onReject) => {
        reject = onReject;
      })
    );
    const { onClose, onError, unmount } = renderModal(listWorkloads);

    unmount();
    reject(new Error('Network failure'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onError).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
