/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useEffect } from 'react';
import { waitFor } from '@testing-library/react';

import { sendGetOneBulkUpgradePackagesForRq } from '../../../../../../../hooks';
import { createFleetTestRendererMock } from '../../../../../../../mock';
import type { InstalledPackageUIPackageListItem } from '../types';

import { BulkActionContextProvider, bulkActionsContext } from './use_bulk_actions_context';

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  sendGetOneBulkUpgradePackagesForRq: jest.fn(),
}));

const StartBulkUpgrade = () => {
  const {
    bulkActions: { setPollingBulkActions },
  } = useContext(bulkActionsContext);
  useEffect(() => {
    setPollingBulkActions([
      {
        taskId: 'task-1',
        type: 'bulk_upgrade',
        integrations: [{ name: 'aws_mq' } as InstalledPackageUIPackageListItem],
      },
    ]);
  }, [setPollingBulkActions]);
  return null;
};

describe('BulkActionContextProvider', () => {
  const renderUpgrade = () => {
    const renderer = createFleetTestRendererMock();
    renderer.render(
      <BulkActionContextProvider>
        <StartBulkUpgrade />
      </BulkActionContextProvider>
    );
    return renderer.startServices.notifications.toasts;
  };

  beforeEach(() => {
    jest.mocked(sendGetOneBulkUpgradePackagesForRq).mockReset();
  });

  it('warns about package policies skipped because of their agents versions', async () => {
    jest.mocked(sendGetOneBulkUpgradePackagesForRq).mockResolvedValue({
      status: 'success',
      results: [
        {
          name: 'aws_mq',
          success: true,
          skipped_package_policies: [{ id: 'pp-1', name: 'mq-old', version_condition: '^9.4.0' }],
        },
      ],
    });

    const toasts = renderUpgrade();

    await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalled());
    expect(toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Fleet skipped 1 agent-based policy',
        text: expect.stringContaining('mq-old (aws_mq ^9.4.0)'),
      })
    );
  });

  it('does not warn when no package policy was skipped', async () => {
    jest.mocked(sendGetOneBulkUpgradePackagesForRq).mockResolvedValue({
      status: 'success',
      results: [{ name: 'aws_mq', success: true }],
    });

    const toasts = renderUpgrade();

    await waitFor(() => expect(toasts.addSuccess).toHaveBeenCalled());
    expect(toasts.addWarning).not.toHaveBeenCalled();
  });
});
