/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceAccountWorkloadBinding } from '@kbn/core-security-common';
import { getWorkflowPageStatus } from './get_workflow_page_status';
import type { WorkflowPageDto } from '../pages/types';
import type { WorkflowProperties } from '../storage/workflow_storage';

const ACCOUNT = 'kibana/pages';

const onlinePage: WorkflowPageDto = {
  workflowId: 'wf-1',
  pageId: 'default',
  access: { level: 'secret_link' },
  enabled: true,
  online: true,
};

const boundWorkflow = {
  enabled: true,
  valid: true,
  definition: { settings: { run_as: ACCOUNT } },
} as unknown as WorkflowProperties;

const setup = ({
  pagesEnabled = true,
  bindingsEnabled = true,
  boundAccountId = ACCOUNT as string | null,
  summary = { id: ACCOUNT, name: 'pages', enabled: true, assumable: true } as {
    id: string;
    name: string;
    enabled: boolean;
    assumable: boolean;
  } | null,
} = {}) => ({
  arePagesEnabled: jest.fn(async () => pagesEnabled),
  serviceAccountBindings: {
    isEnabled: jest.fn(() => bindingsEnabled),
    getWorkloadBinding: jest.fn(async () =>
      boundAccountId === null
        ? null
        : ({ serviceAccountId: boundAccountId } as ServiceAccountWorkloadBinding)
    ),
    getWorkloadServiceAccountSummary: jest.fn(async () => summary),
  },
});

const status = (
  deps: ReturnType<typeof setup>,
  page: Partial<WorkflowPageDto> = {},
  workflow: Partial<WorkflowProperties> = {}
) =>
  getWorkflowPageStatus(deps, {
    page: { ...onlinePage, ...page },
    workflow: { ...boundWorkflow, ...workflow } as WorkflowProperties,
    spaceId: 'default',
  });

describe('getWorkflowPageStatus', () => {
  it('is online when every check passes', async () => {
    const deps = setup();

    await expect(status(deps)).resolves.toEqual({ online: true, reasons: [] });
    expect(deps.serviceAccountBindings.getWorkloadServiceAccountSummary).toHaveBeenCalledWith({
      workloadType: 'workflow',
      workloadId: 'wf-1',
      spaceId: 'default',
    });
  });

  it('lists every reason at once', async () => {
    const result = await status(
      setup({ pagesEnabled: false }),
      { access: null, enabled: false, online: false },
      { enabled: false, valid: false, definition: undefined }
    );

    expect(result).toEqual({
      online: false,
      reasons: [
        'pages_disabled',
        'no_access_level',
        'page_disabled',
        'workflow_disabled',
        'workflow_invalid',
        'no_service_account',
      ],
    });
  });

  it('reports a missing encryption key when the page is set up but not online', async () => {
    await expect(status(setup(), { online: false })).resolves.toEqual({
      online: false,
      reasons: ['encryption_unavailable'],
    });
  });

  it.each([
    ['service_accounts_disabled', { bindingsEnabled: false }],
    ['not_bound', { boundAccountId: null }],
    ['not_bound', { boundAccountId: 'kibana/other' }],
    ['service_account_missing', { summary: null }],
    [
      'service_account_disabled',
      { summary: { id: ACCOUNT, name: 'pages', enabled: false, assumable: true } },
    ],
  ])('reports %s', async (reason, options) => {
    await expect(status(setup(options))).resolves.toEqual({ online: false, reasons: [reason] });
  });

  it('skips the account read when the binding does not match', async () => {
    const deps = setup({ boundAccountId: 'kibana/other' });

    await status(deps);

    expect(deps.serviceAccountBindings.getWorkloadServiceAccountSummary).not.toHaveBeenCalled();
  });
});
