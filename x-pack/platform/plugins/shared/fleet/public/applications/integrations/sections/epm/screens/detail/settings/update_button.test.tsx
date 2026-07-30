/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';

import { UpdateButton } from './update_button';

const mockInstallPackage = jest.fn();
const mockSendBulkUpgradeAgentlessPolicies = jest.fn();
const mockUpgradePoliciesMutateAsync = jest.fn();

jest.mock('../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../hooks'),
  useConfirmForceInstall: jest.fn(),
  useInstallPackage: () => mockInstallPackage,
  useGetPackageInstallStatus: () => () => ({ status: 'installed', version: '1.0.0' }),
  useAuthz: () => ({ integrations: { upgradePackages: true } }),
  useLink: () => ({ getPath: (page: string) => `/mock/${page}` }),
  useUpgradePackagePoliciesMutation: () => ({ mutateAsync: mockUpgradePoliciesMutateAsync }),
  useBulkGetAgentPoliciesQuery: () => ({ data: undefined }),
  sendBulkUpgradeAgentlessPolicies: (...args: unknown[]) =>
    mockSendBulkUpgradeAgentlessPolicies(...args),
}));

const defaultProps = {
  name: 'nginx',
  title: 'Nginx',
  version: '2.0.0',
  packagePolicyIds: [],
  agentPolicyIds: [],
};

const renderAndConfirmUpgrade = async (
  props: Partial<React.ComponentProps<typeof UpdateButton>>
) => {
  const renderer = createIntegrationsTestRendererMock();
  const utils = renderer.render(
    <UpdateButton {...defaultProps} startServices={renderer.startServices} {...props} />
  );

  fireEvent.click(utils.getByTestId('updatePackageBtn'));
  await waitFor(() => expect(utils.getByTestId('confirmModalConfirmButton')).toBeInTheDocument());
  fireEvent.click(utils.getByTestId('confirmModalConfirmButton'));

  return { utils, toasts: renderer.startServices.notifications.toasts };
};

describe('UpdateButton agentless dry-run guard failures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstallPackage.mockResolvedValue(true);
    mockSendBulkUpgradeAgentlessPolicies.mockResolvedValue([{ id: 'agentless-ok', success: true }]);
  });

  it('warns about skipped guard-failure policies instead of silently omitting them', async () => {
    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-ok', 'agentless-gone'],
      agentlessDryRunData: [
        { id: 'agentless-ok', name: 'ok-policy', hasErrors: false },
        // A guard failure: the dry-run itself failed for this policy (e.g. deleted mid-flight).
        { id: 'agentless-gone', name: 'gone-policy', hasErrors: true, statusCode: 404 },
      ],
    });

    // The guard-failure policy stays excluded from the upgrade set.
    await waitFor(() =>
      expect(mockSendBulkUpgradeAgentlessPolicies).toHaveBeenCalledWith(['agentless-ok'])
    );

    // The skip is announced: the success toast alone must not read as a full upgrade.
    expect(toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('1 managed integration'),
        text: expect.stringContaining('gone-policy'),
      })
    );
  });

  it('falls back to the policy id in the skip warning when the dry-run entry has no name', async () => {
    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-ok', 'agentless-gone'],
      agentlessDryRunData: [
        { id: 'agentless-ok', hasErrors: false },
        { id: 'agentless-gone', hasErrors: true, statusCode: 404 },
      ],
    });

    await waitFor(() => expect(toasts.addWarning).toHaveBeenCalled());
    expect(toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('agentless-gone') })
    );
  });

  it('does not warn when the dry-run reports no guard failures', async () => {
    mockSendBulkUpgradeAgentlessPolicies.mockResolvedValue([
      { id: 'agentless-ok', success: true },
      { id: 'agentless-also-ok', success: true },
    ]);

    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-ok', 'agentless-also-ok'],
      agentlessDryRunData: [
        { id: 'agentless-ok', name: 'ok-policy', hasErrors: false },
        { id: 'agentless-also-ok', name: 'also-ok-policy', hasErrors: false },
      ],
    });

    await waitFor(() =>
      expect(mockSendBulkUpgradeAgentlessPolicies).toHaveBeenCalledWith([
        'agentless-ok',
        'agentless-also-ok',
      ])
    );
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });

  it('reports which policies failed a partial bulk upgrade, with the error message', async () => {
    mockSendBulkUpgradeAgentlessPolicies.mockResolvedValue([
      { id: 'agentless-ok', name: 'ok-policy', success: true },
      {
        id: 'agentless-broken',
        name: 'broken-policy',
        success: false,
        statusCode: 500,
        body: { message: 'mapping failed' },
      },
    ]);

    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-ok', 'agentless-broken'],
      agentlessDryRunData: [
        { id: 'agentless-ok', name: 'ok-policy', hasErrors: false },
        { id: 'agentless-broken', name: 'broken-policy', hasErrors: false },
      ],
    });

    // The toast must name the failed policy and carry the API's error message — a bare count
    // leaves the operator unable to tell which policies to fix.
    await waitFor(() =>
      expect(toasts.addWarning).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Error upgrading managed integrations'),
          text: expect.stringContaining('broken-policy'),
        })
      )
    );
    expect(toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('mapping failed') })
    );
    const warningText = (toasts.addWarning as jest.Mock).mock.calls[0][0].text;
    expect(warningText).not.toContain('ok-policy');
  });

  it('falls back to the policy id in the partial-failure toast when the result has no name', async () => {
    mockSendBulkUpgradeAgentlessPolicies.mockResolvedValue([
      { id: 'agentless-broken', success: false, statusCode: 500 },
    ]);

    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-broken'],
      agentlessDryRunData: [{ id: 'agentless-broken', hasErrors: false }],
    });

    await waitFor(() => expect(toasts.addWarning).toHaveBeenCalled());
    const warningText = (toasts.addWarning as jest.Mock).mock.calls[0][0].text;
    expect(warningText).toContain('agentless-broken');
    // No per-policy error message in the response — no dangling "Error:" suffix.
    expect(warningText).not.toContain('Error:');
  });

  it('does not warn about config-migration conflicts (announced in the modal instead)', async () => {
    const { toasts } = await renderAndConfirmUpgrade({
      agentlessPolicyIds: ['agentless-ok', 'agentless-conflict'],
      agentlessDryRunData: [
        { id: 'agentless-ok', name: 'ok-policy', hasErrors: false },
        // A real conflict (no statusCode): the confirm modal's conflict callout covers it.
        {
          id: 'agentless-conflict',
          name: 'conflict-policy',
          hasErrors: true,
          errors: [{ message: 'var removed' }],
        },
      ],
    });

    await waitFor(() =>
      expect(mockSendBulkUpgradeAgentlessPolicies).toHaveBeenCalledWith(['agentless-ok'])
    );
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });
});
