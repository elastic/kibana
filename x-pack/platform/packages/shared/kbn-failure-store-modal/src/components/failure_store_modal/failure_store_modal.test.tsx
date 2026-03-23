/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, fireEvent, waitFor, within } from '@testing-library/react';
import type { FailureStoreFormProps } from './failure_store_modal';
import { FailureStoreModal } from './failure_store_modal';

const defaultProps = {
  onCloseModal: jest.fn(),
  onSaveModal: jest.fn(),
  failureStoreProps: {
    failureStoreEnabled: false,
    defaultRetentionPeriod: '30d',
  } as FailureStoreFormProps,
};

const renderModal = (
  failureStoreProps = defaultProps.failureStoreProps,
  inheritOptions?: {
    canShowInherit: boolean;
    isWired: boolean;
    isCurrentlyInherited: boolean;
  },
  canShowDisableLifecycle?: boolean,
  disableButtonLabel?: string
) => {
  return render(
    <IntlProvider>
      <FailureStoreModal
        {...defaultProps}
        failureStoreProps={failureStoreProps}
        inheritOptions={inheritOptions}
        canShowDisableLifecycle={canShowDisableLifecycle}
        disableButtonLabel={disableButtonLabel}
      />
    </IntlProvider>
  );
};

describe('FailureStoreModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with failure store toggle', () => {
    const { getByTestId } = renderModal();

    expect(getByTestId('editFailureStoreModal')).toBeInTheDocument();
    expect(getByTestId('enableFailureStoreToggle')).toBeInTheDocument();
  });

  it('renders form fields when failure store is enabled', () => {
    const { getByTestId } = renderModal({
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
    });

    expect(getByTestId('selectFailureStorePeriodType')).toBeInTheDocument();
    expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
    expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();
  });

  it('does not render period fields when failure store is disabled', () => {
    const { queryByTestId } = renderModal();

    expect(queryByTestId('selectFailureStorePeriodType')).not.toBeInTheDocument();
    expect(queryByTestId('selectFailureStorePeriodValue')).not.toBeInTheDocument();
    expect(queryByTestId('selectFailureStoreRetentionPeriodUnit')).not.toBeInTheDocument();
  });

  it('calls onCloseModal when cancel button is clicked', () => {
    const { getByTestId } = renderModal();

    fireEvent.click(getByTestId('failureStoreModalCancelButton'));
    expect(defaultProps.onCloseModal).toHaveBeenCalledTimes(1);
  });

  it('renders retention period info text when failure store is enabled', () => {
    const { getByText } = renderModal({
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
    });

    expect(
      getByText(
        'This retention period stores data in the hot tier for best indexing and search performance.'
      )
    ).toBeInTheDocument();
  });

  it('displays a callout when there is not info about default retention period', () => {
    const { queryByTestId } = renderModal({
      failureStoreEnabled: true,
    });
    expect(queryByTestId('defaultRetentionCallout')).toBeInTheDocument();
  });

  it('displays no callout when there is info about default retention period', () => {
    const { queryByTestId } = renderModal({
      failureStoreEnabled: true,
      defaultRetentionPeriod: '30d',
    });
    expect(queryByTestId('defaultRetentionCallout')).not.toBeInTheDocument();
  });
  describe('save modal', () => {
    it('only saves failureStoreEnabled if it is disabled', async () => {
      const { getByTestId, queryByTestId } = renderModal({
        failureStoreEnabled: true,
        defaultRetentionPeriod: '30d',
        customRetentionPeriod: '15d',
      });

      expect(getByTestId('failureStoreModalSaveButton')).toBeInTheDocument();
      expect(getByTestId('failureStoreModalSaveButton')).toBeDisabled();
      // Expect the toggle to be on initially
      expect(getByTestId('enableFailureStoreToggle')).toBeChecked();

      expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
      expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();

      expect(getByTestId('selectFailureStorePeriodValue')).toHaveValue(15);
      expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toHaveTextContent('Days');

      fireEvent.click(getByTestId('enableFailureStoreToggle'));

      expect(queryByTestId('selectFailureStorePeriodType')).not.toBeInTheDocument();
      expect(queryByTestId('selectFailureStorePeriodValue')).not.toBeInTheDocument();

      expect(getByTestId('failureStoreModalSaveButton')).not.toBeDisabled();
      // Expect the toggle to be off
      expect(getByTestId('enableFailureStoreToggle')).not.toBeChecked();

      fireEvent.click(getByTestId('failureStoreModalSaveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledTimes(1);
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: false,
        });
      });
    });

    it('saves custom retention period when specified', async () => {
      const { getByTestId, findByTestId } = renderModal({
        failureStoreEnabled: false,
        defaultRetentionPeriod: '40m',
      });

      fireEvent.click(getByTestId('enableFailureStoreToggle'));

      const customButton = within(getByTestId('selectFailureStorePeriodType')).getByRole('button', {
        name: /custom/i,
      });
      const defaultButton = within(getByTestId('selectFailureStorePeriodType')).getByRole(
        'button',
        {
          name: /default/i,
        }
      );
      const valueSelector = await findByTestId('selectFailureStorePeriodValue');
      const unitSelector = await findByTestId('selectFailureStoreRetentionPeriodUnit');

      expect(customButton).toHaveAttribute('aria-pressed', 'false');
      expect(defaultButton).toHaveAttribute('aria-pressed', 'true');

      expect(valueSelector).toBeInTheDocument();
      expect(unitSelector).toBeInTheDocument();
      expect(valueSelector).toBeDisabled();
      expect(unitSelector).toBeDisabled();

      // The default retention period in the props is 40m, so the value should be 40 and unit 'Minutes'
      expect(valueSelector).toHaveValue(40);
      expect(unitSelector).toHaveTextContent('Minutes');

      fireEvent.click(customButton);

      expect(customButton).toHaveAttribute('aria-pressed', 'true');
      expect(defaultButton).toHaveAttribute('aria-pressed', 'false');

      expect(valueSelector).not.toBeDisabled();
      expect(unitSelector).not.toBeDisabled();

      // The custom retention period by default is the default period, so the value should be 40 and unit 'Minutes'
      expect(valueSelector).toHaveValue(40);
      expect(unitSelector).toHaveTextContent('Minutes');

      fireEvent.click(unitSelector);
      fireEvent.click(getByTestId('retentionPeriodUnit-s'));
      fireEvent.change(valueSelector, { target: { value: '15' } });

      expect(unitSelector).toHaveTextContent('Seconds');
      expect(valueSelector).toHaveValue(15);

      fireEvent.click(getByTestId('failureStoreModalSaveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: true,
          customRetentionPeriod: '15s',
        });
      });
    });
  });

  describe('inherit functionality', () => {
    it('renders inherit toggle when inheritOptions are provided', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      expect(getByTestId('inheritFailureStoreSwitch')).toBeInTheDocument();
    });

    it('does not render inherit toggle when inheritOptions are not provided', () => {
      const { queryByTestId } = renderModal({
        failureStoreEnabled: true,
        defaultRetentionPeriod: '30d',
      });

      expect(queryByTestId('inheritFailureStoreSwitch')).not.toBeInTheDocument();
    });

    it('does not render inherit toggle when canShowInherit is false', () => {
      const { queryByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: false,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      expect(queryByTestId('inheritFailureStoreSwitch')).not.toBeInTheDocument();
    });

    it('disables all fields when inherit toggle is enabled', async () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
          customRetentionPeriod: '40d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      const inheritToggle = getByTestId('inheritFailureStoreSwitch');
      const failureStoreToggle = getByTestId('enableFailureStoreToggle');
      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');

      // Initially, inherit is off and fields should be enabled
      expect(inheritToggle).not.toBeChecked();
      expect(failureStoreToggle).not.toBeDisabled();

      // Enable inherit toggle
      fireEvent.click(inheritToggle);

      await waitFor(() => {
        expect(inheritToggle).toBeChecked();
        expect(failureStoreToggle).toBeDisabled();
        // Check that period type button group is disabled
        const buttons = within(periodTypeButtons).getAllByRole('button');
        buttons.forEach((button) => {
          expect(button).toBeDisabled();
        });
      });
    });

    it('do not reset fields to initial values when inherit is enabled', async () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
          customRetentionPeriod: '40d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      const inheritToggle = getByTestId('inheritFailureStoreSwitch');
      const failureStoreToggle = getByTestId('enableFailureStoreToggle');
      const valueSelector = getByTestId('selectFailureStorePeriodValue');

      // Initially, failure store is enabled with custom period of 40d
      expect(failureStoreToggle).toBeChecked();
      expect(valueSelector).toHaveValue(40);

      // Modify the failure store toggle
      fireEvent.click(failureStoreToggle);
      expect(failureStoreToggle).not.toBeChecked();

      // Enable inherit toggle
      fireEvent.click(inheritToggle);

      await waitFor(() => {
        // Fields should maintain the modified values
        expect(failureStoreToggle).not.toBeChecked();
      });
    });

    it('saves inherit configuration when inherit is enabled', async () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: false,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      const inheritToggle = getByTestId('inheritFailureStoreSwitch');
      const saveButton = getByTestId('failureStoreModalSaveButton');

      // Enable inherit toggle
      fireEvent.click(inheritToggle);

      await waitFor(() => {
        expect(inheritToggle).toBeChecked();
        expect(saveButton).not.toBeDisabled();
      });

      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          inherit: true,
          failureStoreEnabled: false,
        });
      });
    });

    it('initializes with inherit enabled when isCurrentlyInherited is true', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: false,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: true,
        }
      );

      const inheritToggle = getByTestId('inheritFailureStoreSwitch');
      const failureStoreToggle = getByTestId('enableFailureStoreToggle');

      expect(inheritToggle).toBeChecked();
      expect(failureStoreToggle).toBeDisabled();
    });

    it('enables fields when inherit is disabled after being enabled', async () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      const inheritToggle = getByTestId('inheritFailureStoreSwitch');
      const failureStoreToggle = getByTestId('enableFailureStoreToggle');

      // Enable inherit
      fireEvent.click(inheritToggle);

      await waitFor(() => {
        expect(failureStoreToggle).toBeDisabled();
      });

      // Disable inherit
      fireEvent.click(inheritToggle);

      await waitFor(() => {
        expect(inheritToggle).not.toBeChecked();
        expect(failureStoreToggle).not.toBeDisabled();
      });
    });

    it('displays wired inheritance labels when isWired is true', () => {
      const { getByText } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: true,
          isCurrentlyInherited: false,
        }
      );

      expect(getByText('Inherit from parent stream')).toBeInTheDocument();
      expect(
        getByText("Use the failure retention configuration from this stream's parent")
      ).toBeInTheDocument();
    });

    it('displays classic inheritance labels when isWired is false', () => {
      const { getByText } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        {
          canShowInherit: true,
          isWired: false,
          isCurrentlyInherited: false,
        }
      );

      expect(getByText('Inherit from index template')).toBeInTheDocument();
      expect(
        getByText("Use failure retention configuration from this stream's index template")
      ).toBeInTheDocument();
    });
  });

  describe('disabled lifecycle functionality', () => {
    it('shows disabled option when canShowDisableLifecycle is true', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).queryByRole('button', {
        name: /disabled/i,
      });

      expect(disabledButton).toBeInTheDocument();
    });

    it('shows default disabled label when disableButtonLabel is not provided', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: /disabled/i,
      });

      expect(disabledButton).toHaveTextContent('Disabled');
    });

    it('shows custom disabled label when disableButtonLabel is provided', () => {
      const customLabel = 'Forever';
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true,
        customLabel
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: customLabel,
      });

      expect(disabledButton).toBeInTheDocument();
      expect(disabledButton).toHaveTextContent(customLabel);
    });

    it('saves retentionDisabled when custom disabled button is selected', async () => {
      const customLabel = 'Infinite retention';
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true,
        customLabel
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: customLabel,
      });

      fireEvent.click(disabledButton);

      await waitFor(() => {
        expect(disabledButton).toHaveAttribute('aria-pressed', 'true');
      });

      fireEvent.click(getByTestId('failureStoreModalSaveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: true,
          retentionDisabled: true,
        });
      });
    });

    it('does not show disabled option when canShowDisableLifecycle is false', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        false
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).queryByRole('button', {
        name: /disabled/i,
      });

      expect(disabledButton).not.toBeInTheDocument();
    });

    it('initializes to disabled period type when retentionDisabled is true and canShowDisableLifecycle is true', () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
          retentionDisabled: true,
        },
        undefined,
        true
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: /disabled/i,
      });

      expect(disabledButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('saves retentionDisabled when disabled option is selected', async () => {
      const { getByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: /disabled/i,
      });

      fireEvent.click(disabledButton);

      await waitFor(() => {
        expect(disabledButton).toHaveAttribute('aria-pressed', 'true');
      });

      fireEvent.click(getByTestId('failureStoreModalSaveButton'));

      await waitFor(() => {
        expect(defaultProps.onSaveModal).toHaveBeenCalledWith({
          failureStoreEnabled: true,
          retentionDisabled: true,
        });
      });
    });

    it('hides retention period fields when disabled option is selected', async () => {
      const { getByTestId, queryByTestId } = renderModal(
        {
          failureStoreEnabled: true,
          defaultRetentionPeriod: '30d',
        },
        undefined,
        true
      );

      const periodTypeButtons = getByTestId('selectFailureStorePeriodType');
      const disabledButton = within(periodTypeButtons).getByRole('button', {
        name: /disabled/i,
      });

      // Initially, retention fields should be visible (default period is selected)
      expect(getByTestId('selectFailureStorePeriodValue')).toBeInTheDocument();
      expect(getByTestId('selectFailureStoreRetentionPeriodUnit')).toBeInTheDocument();

      fireEvent.click(disabledButton);

      await waitFor(() => {
        // Retention period fields should be hidden
        expect(queryByTestId('selectFailureStorePeriodValue')).not.toBeInTheDocument();
        expect(queryByTestId('selectFailureStoreRetentionPeriodUnit')).not.toBeInTheDocument();
      });
    });
  });
});
