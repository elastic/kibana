/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID } from '@kbn/workflows';
import { WorkflowsManagementUiActions } from '@kbn/workflows/common/privileges';
import { WorkflowPageShareModal } from './workflow_page_share_modal';
import type { WorkflowPageResponse } from '../../../../common/pages';
import { createStartServicesMock } from '../../../mocks';
import { TestProvider } from '../../../shared/mocks/test_providers';

const PAGE_PATH = '/internal/workflows/workflow/wf-1/pages/default';

const livePage: WorkflowPageResponse = {
  workflowId: 'wf-1',
  pageId: 'default',
  access: { level: 'secret_link' },
  enabled: true,
  url: '/s/team/pages/wf-1/default/k/secret-1',
  status: { online: true, reasons: [] },
};

const setup = (
  page: Partial<WorkflowPageResponse> = {},
  { canManage = true }: { canManage?: boolean } = {}
) => {
  const services = createStartServicesMock();
  services.application.capabilities = {
    ...services.application.capabilities,
    [WORKFLOWS_MANAGEMENT_FEATURE_ID]: {
      [WorkflowsManagementUiActions.managePages]: canManage,
    },
  };
  services.http.get.mockResolvedValue({ ...livePage, ...page });
  services.http.put.mockResolvedValue({});
  services.http.post.mockResolvedValue({});
  const onClose = jest.fn();
  render(
    <TestProvider services={services}>
      <WorkflowPageShareModal
        workflowId="wf-1"
        pageId="default"
        serviceAccountId="kibana/pages"
        onClose={onClose}
      />
    </TestProvider>
  );
  return { services, onClose };
};

describe('WorkflowPageShareModal', () => {
  it('shows the link and who submissions run as when the page is live', async () => {
    setup();

    expect(await screen.findByTestId('workflowPageShareStatus')).toHaveTextContent('Live');
    expect(screen.getByTestId<HTMLInputElement>('workflowPageShareUrl').value).toBe(
      `${window.location.origin}/s/team/pages/wf-1/default/k/secret-1`
    );
    expect(screen.getByTestId('workflowPageShareServiceAccount')).toHaveTextContent(
      'service account'
    );
    expect(screen.getByText(/Treat the link as a password/)).toBeInTheDocument();
    expect(screen.queryByText('kibana/pages')).not.toBeInTheDocument();
    expect(screen.getByText('Rotate link')).toBeInTheDocument();
    expect(
      screen.getByText('Replace the current link. The old one stops working immediately.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Take the page offline. Publishing again brings back the same link.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('workflowPageShareEnabled')).not.toBeChecked();
    expect(screen.getByTestId('workflowPageShareOpen')).toHaveAttribute('href');
  });

  it('shows only the blockers, with no link and no publish button, when the page cannot run', async () => {
    setup({
      access: null,
      status: { online: false, reasons: ['no_access_level', 'service_account_missing'] },
    });

    expect(await screen.findByTestId('workflowPageShareBlockers')).toHaveTextContent(
      'does not exist'
    );
    expect(screen.queryByTestId('workflowPageShareUrl')).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowPageSharePublish')).not.toBeInTheDocument();
  });

  it('publishes an unpublished page and loads it again', async () => {
    const { services } = setup({
      access: null,
      status: { online: false, reasons: ['no_access_level'] },
    });
    expect(await screen.findByTestId('workflowPageShareStatus')).toHaveTextContent('Not published');
    expect(screen.getByTestId('workflowPageShareCancel')).toBeInTheDocument();
    expect(screen.queryByTestId('workflowPageShareDone')).not.toBeInTheDocument();
    services.http.get.mockResolvedValue(livePage);

    fireEvent.click(screen.getByTestId('workflowPageSharePublish'));

    await waitFor(() =>
      expect(services.http.put).toHaveBeenCalledWith(`${PAGE_PATH}/access`, {
        version: '1',
        body: JSON.stringify({ access: { level: 'secret_link' } }),
      })
    );
    expect(await screen.findByTestId('workflowPageShareUrl')).toBeInTheDocument();
  });

  it('asks before it rotates the link', async () => {
    const { services } = setup();
    fireEvent.click(await screen.findByTestId('workflowPageShareRotate'));

    expect(screen.getByTestId('workflowPageShareConfirm-rotate')).toHaveTextContent(
      'The current link stops working at once.'
    );
    expect(
      screen.queryByText('Replace the current link. The old one stops working immediately.')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('workflowPageShareRotate')).not.toBeInTheDocument();
    expect(services.http.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('workflowPageShareConfirm'));

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(`${PAGE_PATH}/_rotate`, { version: '1' })
    );
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
      title: 'Link rotated',
      text: 'Copy the new link. The previous one stopped working.',
    });
    expect(document.activeElement).toBe(screen.getByTestId('workflowPageShareCopy'));
  });

  it('turns submissions off and explains that the link stays the same', async () => {
    const { services } = setup();
    services.http.get.mockResolvedValue({
      ...livePage,
      enabled: false,
      status: { online: false, reasons: ['page_disabled'] },
    });

    fireEvent.click(await screen.findByTestId('workflowPageShareEnabled'));

    await waitFor(() =>
      expect(services.http.put).toHaveBeenCalledWith(`${PAGE_PATH}/enabled`, {
        version: '1',
        body: JSON.stringify({ enabled: false }),
      })
    );
    expect(
      await screen.findByText('Submissions are paused but the link stays the same.')
    ).toBeVisible();
    expect(screen.queryByTestId('workflowPageShareOfflineReasons')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowPageShareStatus')).toHaveTextContent('Offline');
    expect(screen.getByTestId('workflowPageShareUrl')).toBeDisabled();
    expect(screen.getByTestId('workflowPageShareOpen')).toHaveAttribute('href');
  });

  it('warns when the workflow is disabled', async () => {
    setup({ status: { online: false, reasons: ['workflow_disabled'] } });

    expect(await screen.findByText(/The workflow is disabled/)).toBeVisible();
    expect(screen.getByTestId('workflowPageShareOfflineReasons')).toBeVisible();
    expect(screen.getByTestId('workflowPageShareUrl')).toBeDisabled();
    expect(screen.getByTestId('workflowPageShareOpen')).toHaveAttribute('href');
  });

  it('disables every change without the Manage pages privilege', async () => {
    setup({}, { canManage: false });

    expect(await screen.findByTestId('workflowPageShareEnabled')).toBeDisabled();
    expect(screen.getByTestId('workflowPageShareRotate')).toBeDisabled();
    expect(screen.getByTestId('workflowPageShareUnpublish')).toBeDisabled();
  });

  it('asks before it unpublishes, and keeps the page when cancelled', async () => {
    const { services } = setup();
    fireEvent.click(await screen.findByTestId('workflowPageShareUnpublish'));

    expect(screen.getByTestId('workflowPageShareConfirm-unpublish')).toHaveTextContent(
      'The link stops working until you publish again.'
    );
    expect(screen.queryByTestId('workflowPageShareUnpublish')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByTestId('workflowPageShareConfirm-unpublish')).not.toBeInTheDocument();
    expect(services.http.put).not.toHaveBeenCalled();
  });

  it('shows the server message when a change fails', async () => {
    const { services } = setup();
    services.http.put.mockRejectedValue(new Error('Publishing needs manage_security'));

    fireEvent.click(await screen.findByTestId('workflowPageShareUnpublish'));
    fireEvent.click(screen.getByTestId('workflowPageShareConfirm'));

    expect(await screen.findByTestId('workflowPageShareActionError')).toHaveTextContent(
      'Publishing needs manage_security'
    );
  });
});
