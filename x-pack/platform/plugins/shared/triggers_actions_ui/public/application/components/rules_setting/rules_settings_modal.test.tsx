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
import { RulesSettingsModal, RulesSettingsModalProps } from './rules_settings_modal';
import { useKibana } from '../../../common/lib/kibana';
import { fetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings';
import { updateFlappingSettings } from '../../lib/rule_api/update_flapping_settings';
import { getQueryDelaySettings } from '../../lib/rule_api/get_query_delay_settings';
import { updateQueryDelaySettings } from '../../lib/rule_api/update_query_delay_settings';

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

const modalProps: RulesSettingsModalProps = {
  isVisible: true,
  setUpdatingRulesSettings: jest.fn(),
  onClose: jest.fn(),
  onSave: jest.fn(),
};

const RulesSettingsModalWithProviders: React.FunctionComponent<RulesSettingsModalProps> = (
  props
) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>
      <RulesSettingsModal {...props} />
    </QueryClientProvider>
  </IntlProvider>
);

const waitForModalLoad = async (options?: {
  flappingSection?: boolean;
  queryDelaySection?: boolean;
}) => {
  await waitFor(() => {
    expect(screen.queryByTestId('centerJustifiedSpinner')).toBe(null);
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

describe('rules_settings_modal', () => {
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
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    await waitForModalLoad();
    expect(
      result.getByTestId('rulesSettingsFlappingEnableSwitch').getAttribute('aria-checked')
    ).toBe('true');
    expect(result.getByTestId('lookBackWindowRangeInput').getAttribute('value')).toBe('10');
    expect(result.getByTestId('statusChangeThresholdRangeInput').getAttribute('value')).toBe('10');

    expect(result.getByTestId('rulesSettingsModalCancelButton')).toBeInTheDocument();
    expect(result.getByTestId('rulesSettingsModalSaveButton').getAttribute('disabled')).toBeFalsy();
  });

  test('can save flapping settings', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 20 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 5 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('20');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));

    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
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
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('reset flapping settings to initial state on cancel without triggering another server reload', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
    await waitForModalLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 15 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 3 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('15');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('3');

    // Try cancelling
    await userEvent.click(result.getByTestId('rulesSettingsModalCancelButton'));

    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateFlappingSettingsMock).not.toHaveBeenCalled();
    expect(modalProps.onSave).not.toHaveBeenCalled();

    expect(screen.queryByTestId('centerJustifiedSpinner')).toBe(null);
    expect(lookBackWindowInput.getAttribute('value')).toBe('10');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('10');

    expect(fetchFlappingSettingsMock).toHaveBeenCalledTimes(1);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
  });

  test('should prevent statusChangeThreshold from being greater than lookBackWindow', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

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

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

    const lookBackWindowInput = result.getByTestId('lookBackWindowRangeInput');
    const statusChangeThresholdInput = result.getByTestId('statusChangeThresholdRangeInput');

    fireEvent.change(lookBackWindowInput, { target: { value: 20 } });
    fireEvent.change(statusChangeThresholdInput, { target: { value: 5 } });

    expect(lookBackWindowInput.getAttribute('value')).toBe('20');
    expect(statusChangeThresholdInput.getAttribute('value')).toBe('5');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));
    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('displays flapping detection off prompt when flapping is disabled', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

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
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad({ queryDelaySection: false });

    expect(result.getByTestId('rulesSettingsFlappingEnableSwitch')).toBeDisabled();
    expect(result.getByTestId('lookBackWindowRangeInput')).toBeDisabled();
    expect(result.getByTestId('statusChangeThresholdRangeInput')).toBeDisabled();
    expect(result.getByTestId('rulesSettingsModalSaveButton')).toBeDisabled();
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
    await waitForModalLoad({ flappingSection: false, queryDelaySection: false });

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitFor(() => {
      expect(result.queryByTestId('centerJustifiedSpinner')).toBe(null);
    });

    expect(result.queryByTestId('rulesSettingsFlappingSection')).toBe(null);
  });

  test('renders query delay settings correctly', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    expect(getQueryDelaySettingsMock).toHaveBeenCalledTimes(1);
    await waitForModalLoad();
    expect(result.getByTestId('queryDelayRangeInput').getAttribute('value')).toBe('10');

    expect(result.getByTestId('rulesSettingsModalCancelButton')).toBeInTheDocument();
    expect(result.getByTestId('rulesSettingsModalSaveButton').getAttribute('disabled')).toBeFalsy();
  });

  test('can save query delay settings', async () => {
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

    const queryDelayRangeInput = result.getByTestId('queryDelayRangeInput');
    fireEvent.change(queryDelayRangeInput, { target: { value: 20 } });
    expect(queryDelayRangeInput.getAttribute('value')).toBe('20');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));

    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(updateQueryDelaySettingsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryDelaySettings: {
          delay: 20,
        },
      })
    );
    expect(useKibanaMock().services.notifications.toasts.addSuccess).toHaveBeenCalledTimes(1);
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
  });

  test('handles errors when saving query delay settings', async () => {
    updateQueryDelaySettingsMock.mockRejectedValue('failed!');

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad();

    const queryDelayRangeInput = result.getByTestId('queryDelayRangeInput');
    fireEvent.change(queryDelayRangeInput, { target: { value: 20 } });
    expect(queryDelayRangeInput.getAttribute('value')).toBe('20');

    // Try saving
    await userEvent.click(result.getByTestId('rulesSettingsModalSaveButton'));
    await waitFor(() => {
      expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    });
    expect(modalProps.onClose).toHaveBeenCalledTimes(1);
    expect(useKibanaMock().services.notifications.toasts.addDanger).toHaveBeenCalledTimes(1);
    expect(modalProps.setUpdatingRulesSettings).toHaveBeenCalledWith(true);
    expect(modalProps.onSave).toHaveBeenCalledTimes(1);
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
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad({ flappingSection: false });

    expect(result.getByTestId('queryDelayRangeInput')).toBeDisabled();
    expect(result.getByTestId('rulesSettingsModalSaveButton')).toBeDisabled();
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

    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad({ flappingSection: false, queryDelaySection: false });

    expect(result.queryByTestId('rulesSettingsQueryDelaySection')).toBe(null);
  });

  test('hides query delay settings when not serverless', async () => {
    useKibanaMock().services.isServerless = false;
    const result = render(<RulesSettingsModalWithProviders {...modalProps} />);
    await waitForModalLoad({ queryDelaySection: false });
    expect(result.queryByTestId('rulesSettingsQueryDelaySection')).not.toBeInTheDocument();
  });
});
