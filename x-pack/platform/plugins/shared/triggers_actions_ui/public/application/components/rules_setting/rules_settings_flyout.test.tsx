/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import { IToasts } from '@kbn/core/public';
import { RulesSettingsFlapping, RulesSettingsQueryDelay } from '@kbn/alerting-plugin/common';
import { RulesSettingsFlyout, RulesSettingsFlyoutProps } from './rules_settings_flyout';
import { useKibana } from '../../../common/lib/kibana';
import { fetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings';
import { updateFlappingSettings } from '../../lib/rule_api/update_flapping_settings';
import { getQueryDelaySettings } from '../../lib/rule_api/get_query_delay_settings';
import { updateQueryDelaySettings } from '../../lib/rule_api/update_query_delay_settings';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';

jest.mock('../../../common/lib/kibana');
jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings', () => ({
  fetchFlappingSettings: jest.fn(),
}));
jest.mock('../../lib/rule_api/update_flapping_settings', () => ({
  updateFlappingSettings: jest.fn(),
}));
jest.mock('../../lib/rule_api/get_query_delay_settings', () => ({
  getQueryDelaySettings: jest.fn(),
}));
jest.mock('../../lib/rule_api/update_query_delay_settings', () => ({
  updateQueryDelaySettings: jest.fn(),
}));
jest.mock('../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const mocks = coreMock.createSetup();

const fetchFlappingSettingsMock = fetchFlappingSettings as unknown as jest.MockedFunction<
  typeof fetchFlappingSettings
>;
const updateFlappingSettingsMock = updateFlappingSettings as unknown as jest.MockedFunction<
  typeof updateFlappingSettings
>;
const getQueryDelaySettingsMock = getQueryDelaySettings as unknown as jest.MockedFunction<
  typeof getQueryDelaySettings
>;
const updateQueryDelaySettingsMock = updateQueryDelaySettings as unknown as jest.MockedFunction<
  typeof updateQueryDelaySettings
>;

const mockFlappingSetting: RulesSettingsFlapping = {
  enabled: true,
  lookBackWindow: 10,
  statusChangeThreshold: 10,
  createdBy: 'test user',
  updatedBy: 'test user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
const mockQueryDelaySetting: RulesSettingsQueryDelay = {
  delay: 10,
  createdBy: 'test user',
  updatedBy: 'test user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const flyoutProps: RulesSettingsFlyoutProps = {
  isVisible: true,
  setUpdatingRulesSettings: jest.fn(),
  onClose: jest.fn(),
  onSave: jest.fn(),
  alertDeleteCategoryIds: ['management'],
};

const RulesSettingsFlyoutWithProviders: React.FunctionComponent<RulesSettingsFlyoutProps> = (
  props
) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <RulesSettingsFlyout {...props} />
    </QueryClientProvider>
  </IntlProvider>
);

const waitForFlyoutLoad = async (options?: {
  flappingSection?: boolean;
  queryDelaySection?: boolean;
}) => {
  await waitFor(() => {
    expect(screen.queryByTestId('rulesSettingsFlyout')).not.toBe(null);
  });

  const { flappingSection = true, queryDelaySection = true } = options || {};

  await waitFor(() => {
    if (flappingSection) {
      expect(screen.queryByTestId('rulesSettingsFlappingSection')).toBeInTheDocument();
    }
    if (queryDelaySection) {
      expect(screen.queryByTestId('rulesSettingsQueryDelaySection')).toBeInTheDocument();
    }
  });
};

describe('rules_settings_flyout', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: true,
        writeQueryDelaySettingsUI: true,
        readQueryDelaySettingsUI: true,
      },
    };

    useKibanaMock().services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;

    useKibanaMock().services.isServerless = true;

    fetchFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    updateFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    getQueryDelaySettingsMock.mockResolvedValue(mockQueryDelaySetting);
    updateQueryDelaySettingsMock.mockResolvedValue(mockQueryDelaySetting);
  });

  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    cleanup();
  });

  test('renders flapping settings correctly', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    await waitForFlyoutLoad();
    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(result.getByTestId('lookBackWindowRangeInput').getAttribute('value')).toBe('10');
    expect(result.getByTestId('statusChangeThresholdRangeInput').getAttribute('value')).toBe('10');

    expect(result.getByTestId('rulesSettingsFlyoutCancelButton')).toBeInTheDocument();
    expect(
      result.getByTestId('rulesSettingsFlyoutSaveButton').getAttribute('disabled')
    ).toBeFalsy();
  });

  test('can save flapping settings', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 20 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 5 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('20');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsFlyoutSaveButton'));

    await waitFor(() => {
      expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(flyoutProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateFlappingSettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        flappingSettings: {
          enabled: true,
          lookBackWindow: 20,
          statusChangeThreshold: 5,
        },
      })
    );
    expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(flyoutProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('reset flapping settings to initial state on cancel without triggering another server reload', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
    await waitForFlyoutLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 15 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 3 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('15');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('3');

    // Try cancelling
    await userEvent.click(result.getByTestId('rulesSettingsFlyoutCancelButton'));

    expect(flyoutProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateFlappingSettingsMock).not.toHaveBeenCalled();
    expect(flyoutProps.onSave).not.toHaveBeenCalled();

    expect(screen.queryByTestId('centerJustifiedSpinner')).toBe(null);
    expect(lookBackWindowInput.getAttribute('value')).toBe('10');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('10');

    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
  });

  test('should prevent statusChangeThreshold from being greater than lookBackWindow', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    // Change lookBackWindow to a smaller value
    fireEvent.change(lookBackWindowInput, { target: { value: 5 } });
    // statusChangeThresholdInput gets pinned to be 5
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try making statusChangeThreshold bigger
    fireEvent.change(statusChangeThresholdInput, { target: { value: 20 } });
    // Still pinned
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    fireEvent.change(statusChangeThresholdInput, { target: { value: 3 } });
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('3');
  });

  test('handles errors when saving settings', async () => {
    updateFlappingSettingsMock.mockRejectedValue('failed!');

    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 20 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 5 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('20');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsFlyoutSaveButton'));
    await waitFor(() => {
      expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(flyoutProps.onClose).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(flyoutProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('displays flapping detection off prompt when flapping is disabled', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    expect(result.queryByTestId('rulesSettingsFlappingOffPrompt')).toBe(null);
    await userEvent.click(result.getByTestId('rulesSettingsFlappingEnableSwitch'));
    expect(result.queryByTestId('rulesSettingsFlappingOffPrompt')).not.toBe(null);
  });

  test('form elements are disabled when provided with insufficient write permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: false,
        readFlappingSettingsUI: true,
      },
    };
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad({ queryDelaySection: false });

    expect(result.getByTestId('rulesSettingsFlappingEnableSwitch')).toBeDisabled();
    expect(result.getByTestId('lookBackWindowRangeInput')).toBeDisabled();
    expect(result.getByTestId('statusChangeThresholdRangeInput')).toBeDisabled();
    expect(result.getByTestId('rulesSettingsFlyoutSaveButton')).toBeDisabled();
  });

  test('form elements are not visible when provided with insufficient read permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: false,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: false,
      },
    };

    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad({ flappingSection: false, queryDelaySection: false });

    expect(result.queryByTestId('rulesSettingsFlappingSection')).toBe(null);
  });

  test('renders query delay settings correctly', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
    await waitForFlyoutLoad();
    expect(result.getByTestId('queryDelayRangeInput').getAttribute('value')).toBe('10');

    expect(result.getByTestId('rulesSettingsFlyoutCancelButton')).toBeInTheDocument();
    expect(
      result.getByTestId('rulesSettingsFlyoutSaveButton').getAttribute('disabled')
    ).toBeFalsy();
  });

  test('can save query delay settings', async () => {
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    const queryDelayRangeInput = result.getByTestId('queryDelayRangeInput');
    fireEvent.change(queryDelayRangeInput, { target: { value: 20 } });
    expect(queryDelayRangeInput.getAttribute('value')).toBe('20');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsFlyoutSaveButton'));

    await waitFor(() => {
      expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(flyoutProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateQueryDelaySettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryDelaySettings: {
          delay: 20,
        },
      })
    );
    expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(flyoutProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('handles errors when saving query delay settings', async () => {
    updateQueryDelaySettingsMock.mockRejectedValue('failed!');

    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad();

    const queryDelayRangeInput = result.getByTestId('queryDelayRangeInput');
    fireEvent.change(queryDelayRangeInput, { target: { value: 20 } });
    expect(queryDelayRangeInput.getAttribute('value')).toBe('20');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsFlyoutSaveButton'));
    await waitFor(() => {
      expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(flyoutProps.onClose).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(flyoutProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(flyoutProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('query delay form elements are disabled when provided with insufficient write permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeQueryDelaySettingsUI: false,
        readQueryDelaySettingsUI: true,
      },
    };
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad({ flappingSection: false });

    expect(result.getByTestId('queryDelayRangeInput')).toBeDisabled();
    expect(result.getByTestId('rulesSettingsFlyoutSaveButton')).toBeDisabled();
  });

  test('query delay form elements are not visible when provided with insufficient read permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: false,
        writeQueryDelaySettingsUI: true,
        readQueryDelaySettingsUI: false,
      },
    };

    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad({ flappingSection: false, queryDelaySection: false });

    expect(result.queryByTestId('rulesSettingsQueryDelaySection')).toBe(null);
  });

  test('hides query delay settings when not serverless', async () => {
    useKibanaMock().services.isServerless = false;
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitForFlyoutLoad({ queryDelaySection: false });
    expect(result.queryByTestId('rulesSettingsQueryDelaySection')).not.toBeInTheDocument();
  });

  test('alert delete is disabled when provided with insufficient write permissions', async () => {
    (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => true);

    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeAlertDeleteSettingsUI: false,
        readAlertDeleteSettingsUI: true,
      },
    };
    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitFor(() => {
      expect(screen.queryByTestId('rulesSettingsFlyout')).not.toBe(null);
    });

    expect(result.getByTestId('alert-delete-open-modal-button')).toBeDisabled();
  });

  test('alert delete not visible when provided with insufficient read permissions', async () => {
    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    useKibanaMock().services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: false,
        writeAlertDeleteSettingsUI: true,
        readAlertDeleteSettingsUI: false,
      },
    };

    const result = render(<RulesSettingsFlyoutWithProviders {...flyoutProps} />);
    await waitFor(() => {
      expect(screen.queryByTestId('rulesSettingsFlyout')).not.toBe(null);
    });

    expect(result.queryByTestId('alert-delete-open-modal-button')).toBe(null);
  });
});
