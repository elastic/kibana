/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render } from '@testing-library/react';
import {
  EditDataLifecycleFlyout,
  type EditDataLifecycleFlyoutProps,
} from './edit_data_lifecycle_flyout';

const BASE_SUCCESSFUL_DATA: EditDataLifecycleFlyoutProps['successfulData'] = {
  inheritLifecycle: false,
  onInheritLifecycleChange: jest.fn(),
  dlm: {
    hasEnterpriseLicense: true,
    hasDefaultSnapshotRepository: true,
    defaultSnapshotRepository: 'found-snapshots',
    manageRepositoriesUrl: '/app/management/data/snapshot_restore/repositories',
    createDefaultRepositoryUrl: '/app/management/data/snapshot_restore/add_repository',
    canCreateDefaultSnapshotRepository: true,
    enterprise: {
      isCloudEnabled: true,
      canManageLicense: true,
      trialDaysLeft: undefined,
      onUpgrade: jest.fn(),
      subscriptionFeaturesUrl: 'https://www.elastic.co/subscriptions/cloud',
    },
  },
};

const BASE_FAILED_DATA: EditDataLifecycleFlyoutProps['failedData'] = {
  inheritLifecycle: false,
  onInheritLifecycleChange: jest.fn(),
  failureStoreEnabled: true,
  onFailureStoreChange: jest.fn(),
  deletePhaseDefaultValue: { enabled: false, value: '60', unit: 'd' },
};

const renderFlyout = (props?: Partial<EditDataLifecycleFlyoutProps>) => {
  const onClose = jest.fn();
  const onApply = jest.fn();

  const result = render(
    <IntlProvider>
      <EditDataLifecycleFlyout
        onClose={onClose}
        onApply={onApply}
        successfulData={BASE_SUCCESSFUL_DATA}
        failedData={BASE_FAILED_DATA}
        {...props}
      />
    </IntlProvider>
  );

  return { ...result, onClose, onApply };
};

describe('EditDataLifecycleFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the flyout title and both tabs', () => {
    const { getByText } = renderFlyout();

    expect(getByText('Edit data lifecycle')).toBeInTheDocument();
    expect(getByText('Successful data')).toBeInTheDocument();
    expect(getByText('Failed data')).toBeInTheDocument();
  });

  it('defaults to the successful data tab', () => {
    const { getByTestId } = renderFlyout();

    expect(getByTestId('flyoutTab-successful_data').getAttribute('aria-selected')).toBe('true');
    expect(getByTestId('flyoutTab-failed_data').getAttribute('aria-selected')).toBe('false');
  });

  it('respects initialTabId and opens the failed data tab first', () => {
    const { getByTestId } = renderFlyout({ initialTabId: 'failed_data' });

    expect(getByTestId('flyoutTab-failed_data').getAttribute('aria-selected')).toBe('true');
    expect(getByTestId('flyoutTab-successful_data').getAttribute('aria-selected')).toBe('false');
  });

  it('switches to the failed data tab on click', () => {
    const { getByTestId, getByText } = renderFlyout();

    fireEvent.click(getByTestId('flyoutTab-failed_data'));

    expect(getByTestId('flyoutTab-failed_data').getAttribute('aria-selected')).toBe('true');
    expect(getByText('Delete phase')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const { getByRole, onClose } = renderFlyout();

    fireEvent.click(getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onApply with DLM payload when Apply is clicked', () => {
    const { getByTestId, onApply } = renderFlyout();

    fireEvent.click(getByTestId('editDataLifecycleFlyoutApplyButton'));

    expect(onApply).toHaveBeenCalledWith({
      successfulData: {
        inheritLifecycle: false,
        method: 'dlm',
        frozenAfter: undefined,
        dataRetention: undefined,
      },
      failedData: { inheritLifecycle: false, failureStoreEnabled: true },
    });
  });

  it('includes DLM phase durations in onApply when the user configures them', () => {
    const { getByTestId, onApply } = renderFlyout();

    fireEvent.click(getByTestId('dlmPhasesSelectorDeletePhaseCard'));

    fireEvent.click(getByTestId('editDataLifecycleFlyoutApplyButton'));

    expect(onApply).toHaveBeenCalledWith({
      successfulData: expect.objectContaining({
        method: 'dlm',
        dataRetention: '60d',
      }),
      failedData: expect.anything(),
    });
  });

  it('calls onApply with inheritLifecycle payload when inherit is enabled', () => {
    const { getByTestId, onApply } = renderFlyout({
      successfulData: { ...BASE_SUCCESSFUL_DATA, inheritLifecycle: true },
      failedData: { ...BASE_FAILED_DATA, inheritLifecycle: true },
    });

    fireEvent.click(getByTestId('editDataLifecycleFlyoutApplyButton'));

    expect(onApply).toHaveBeenCalledWith({
      successfulData: { inheritLifecycle: true },
      failedData: { inheritLifecycle: true },
    });
  });

  it('disables the Apply button when method is ILM and no policy is selected', () => {
    const { getByTestId } = renderFlyout({
      successfulData: {
        ...BASE_SUCCESSFUL_DATA,
        inheritLifecycle: false,
        ilm: {
          method: 'ilm',
          onMethodChange: jest.fn(),
          policies: [],
          selectedPolicyName: undefined,
          onPolicySelect: jest.fn(),
        },
      },
    });

    expect(getByTestId('editDataLifecycleFlyoutApplyButton')).toBeDisabled();
  });

  it('enables the Apply button when method is ILM and a policy is selected', () => {
    const { getByTestId } = renderFlyout({
      successfulData: {
        ...BASE_SUCCESSFUL_DATA,
        inheritLifecycle: false,
        ilm: {
          method: 'ilm',
          onMethodChange: jest.fn(),
          policies: [{ name: 'my-policy', phases: {} }],
          selectedPolicyName: 'my-policy',
          onPolicySelect: jest.fn(),
        },
      },
    });

    expect(getByTestId('editDataLifecycleFlyoutApplyButton')).not.toBeDisabled();
  });

  it('enables the Apply button when ILM method is set but lifecycle is inherited', () => {
    const { getByTestId } = renderFlyout({
      successfulData: {
        ...BASE_SUCCESSFUL_DATA,
        inheritLifecycle: true,
        ilm: {
          method: 'ilm',
          onMethodChange: jest.fn(),
          policies: [],
          selectedPolicyName: undefined,
          onPolicySelect: jest.fn(),
        },
      },
    });

    expect(getByTestId('editDataLifecycleFlyoutApplyButton')).not.toBeDisabled();
  });

  it('hides the DLM phase selector when isServerless is true and effectiveMethod is DLM', () => {
    const { queryByText } = renderFlyout({ isServerless: true });

    expect(queryByText('Hot phase')).not.toBeInTheDocument();
    expect(queryByText('Frozen phase')).not.toBeInTheDocument();
  });
});
