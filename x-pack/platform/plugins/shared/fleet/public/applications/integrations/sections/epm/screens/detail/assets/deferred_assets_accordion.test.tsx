/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { fireEvent, waitFor } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo } from '../../../../../types';
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';

import { DeferredAssetsAccordion } from './deferred_assets_accordion';

const mockSendRequestInstallWorkflowAssets = jest.fn();
const mockAddInfo = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockUseAuthz = jest.fn();

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  useAuthz: () => mockUseAuthz(),
  useStartServices: () => ({
    notifications: {
      toasts: {
        addInfo: mockAddInfo,
        addSuccess: mockAddSuccess,
        addError: mockAddError,
      },
    },
  }),
  sendRequestInstallWorkflowAssets: (...args: unknown[]) =>
    mockSendRequestInstallWorkflowAssets(...args),
  sendRequestInstallRuleAssets: jest.fn(),
  sendRequestReauthorizeTransforms: jest.fn(),
}));

const packageInfo = {
  name: 'my_pkg',
  version: '1.0.0',
  title: 'My package',
} as PackageInfo;

const deferredWorkflows = [
  { id: 'wf-1', type: KibanaSavedObjectType.workflow, deferred: true },
  { id: 'wf-2', type: KibanaSavedObjectType.workflow, deferred: true },
];

describe('DeferredAssetsAccordion workflows', () => {
  const forceRefreshAssets = jest.fn();

  const render = () => {
    const renderer = createIntegrationsTestRendererMock();
    return renderer.render(
      <DeferredAssetsAccordion
        packageInfo={packageInfo}
        type={KibanaSavedObjectType.workflow}
        deferredInstallations={deferredWorkflows}
        forceRefreshAssets={forceRefreshAssets}
      />
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSendRequestInstallWorkflowAssets.mockResolvedValue({ success: true });
    mockUseAuthz.mockReturnValue({ integrations: { installPackages: true } });
  });

  it('shows Retry install and license/unavailability copy when the user can install packages', () => {
    const result = render();

    expect(result.getByText('Retry install').closest('button')).toBeEnabled();
    expect(
      result.getByText(
        /2 workflows were not installed because of a license restriction or temporary unavailability/
      )
    ).toBeInTheDocument();
    expect(result.getByText('wf-1')).toBeInTheDocument();
    expect(result.getByText('wf-2')).toBeInTheDocument();
  });

  it('disables Retry install when the user cannot install packages', () => {
    mockUseAuthz.mockReturnValue({ integrations: { installPackages: false } });
    const result = render();

    expect(result.getByText('Retry install').closest('button')).toBeDisabled();
    expect(
      result.getByText(
        /Contact your administrator to install packages, or check the Kibana logs for details/
      )
    ).toBeInTheDocument();
  });

  it('retries workflow install and refreshes assets', async () => {
    const result = render();

    fireEvent.click(result.getByText('Retry install'));

    await waitFor(() => {
      expect(mockSendRequestInstallWorkflowAssets).toHaveBeenCalledWith('my_pkg', '1.0.0');
    });
    expect(mockAddSuccess).toHaveBeenCalled();
    expect(forceRefreshAssets).toHaveBeenCalled();
  });
});
