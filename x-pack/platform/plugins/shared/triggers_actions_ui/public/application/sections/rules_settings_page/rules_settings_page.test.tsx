/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Router } from '@kbn/shared-ux-router';
import { createMemoryHistory } from 'history';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import type { IToasts } from '@kbn/core/public';
import type { RulesSettingsFlapping } from '@kbn/alerting-plugin/common';
import { fetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/apis/fetch_flapping_settings';
import { useKibana } from '../../../common/lib/kibana';
import { updateFlappingSettings } from '../../lib/rule_api/update_flapping_settings';
import { getQueryDelaySettings } from '../../lib/rule_api/get_query_delay_settings';
import { RulesSettingsPageContainer } from './rules_settings_page';

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
jest.mock('../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn().mockReturnValue(false),
}));
jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
}));
jest.mock('../../locator_context', () => ({
  useLocators: () => ({ rules: { useUrl: () => '/rules-list-href' } }),
}));
jest.mock('@kbn/app-header', () => ({
  AppHeader: ({
    title,
    badges,
    back,
  }: {
    title: string;
    badges?: Array<{ label: string }>;
    back: { href: string; label: string };
  }) => (
    <div data-test-subj="appHeader">
      <h1>{title}</h1>
      {badges?.map(({ label }) => (
        <span key={label} data-test-subj="appHeaderBadge">
          {label}
        </span>
      ))}
      <a data-test-subj="appHeaderBack" href={back.href}>
        {back.label}
      </a>
    </div>
  ),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, cacheTime: 0 } },
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

const mockFlappingSetting: RulesSettingsFlapping = {
  enabled: true,
  lookBackWindow: 10,
  statusChangeThreshold: 10,
  createdBy: 'test user',
  updatedBy: 'test user',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const renderPage = (returnPath?: string) => {
  const history = createMemoryHistory({
    initialEntries: [{ pathname: '/settings', state: returnPath ? { returnPath } : undefined }],
  });
  render(
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>
        <Router history={history}>
          <RulesSettingsPageContainer />
        </Router>
      </QueryClientProvider>
    </IntlProvider>
  );
  return history;
};

describe('RulesSettingsPageContainer', () => {
  const setBreadcrumbs = jest.fn();
  const docTitleChange = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const [
      {
        application: { capabilities },
      },
    ] = await mocks.getStartServices();
    const services = useKibanaMock().services;
    services.application.capabilities = {
      ...capabilities,
      rulesSettings: {
        save: true,
        show: true,
        writeFlappingSettingsUI: true,
        readFlappingSettingsUI: true,
        writeQueryDelaySettingsUI: false,
        readQueryDelaySettingsUI: false,
      },
    };
    services.notifications.toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
      addDanger: jest.fn(),
      addWarning: jest.fn(),
    } as unknown as IToasts;
    services.isServerless = false;
    services.setBreadcrumbs = setBreadcrumbs;
    services.showClassicBadge = false;
    services.chrome.docTitle.change = docTitleChange;

    fetchFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    updateFlappingSettingsMock.mockResolvedValue(mockFlappingSetting);
    getQueryDelaySettingsMock.mockResolvedValue({
      delay: 10,
      createdBy: 'test user',
      updatedBy: 'test user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  afterEach(() => {
    queryClient.clear();
    cleanup();
  });

  it('renders the header, the Classic callout and the flapping settings', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByTestId('appHeaderBack')).toHaveAttribute('href', '/rules-list-href');
    expect(screen.getByTestId('rulesSettingsCallout')).toHaveTextContent(
      'Applies to all Classic rules within the current space'
    );
    expect(await screen.findByTestId('rulesSettingsFlappingSection')).toBeInTheDocument();
  });

  it('shows the Classic badge only when showClassicBadge is enabled', () => {
    renderPage();
    expect(screen.queryByTestId('appHeaderBadge')).not.toBeInTheDocument();
    cleanup();

    useKibanaMock().services.showClassicBadge = true;
    renderPage();
    expect(screen.getByTestId('appHeaderBadge')).toHaveTextContent('Classic');
  });

  it('sets the settings breadcrumb and document title', () => {
    renderPage();

    expect(setBreadcrumbs).toHaveBeenCalledWith([
      expect.objectContaining({ text: 'Rules' }),
      expect.objectContaining({ text: 'Settings' }),
    ]);
    expect(docTitleChange).toHaveBeenCalledWith('Settings');
  });

  it('disables Save until a setting changes', async () => {
    renderPage();
    await screen.findByTestId('rulesSettingsFlappingSection');

    expect(screen.getByTestId('rulesSettingsPageSaveButton')).toBeDisabled();

    fireEvent.change(screen.getByTestId('lookBackWindowRangeInput'), { target: { value: 20 } });

    expect(screen.getByTestId('rulesSettingsPageSaveButton')).toBeEnabled();
  });

  it('saves the flapping settings and goes back to the rules list', async () => {
    const history = renderPage();
    await screen.findByTestId('rulesSettingsFlappingSection');

    fireEvent.change(screen.getByTestId('lookBackWindowRangeInput'), { target: { value: 20 } });
    fireEvent.change(screen.getByTestId('statusChangeThresholdRangeInput'), {
      target: { value: 5 },
    });
    await userEvent.click(screen.getByTestId('rulesSettingsPageSaveButton'));

    await waitFor(() => {
      expect(updateFlappingSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          flappingSettings: { enabled: true, lookBackWindow: 20, statusChangeThreshold: 5 },
        })
      );
    });
    await waitFor(() => expect(history.location.pathname).toBe('/'));
  });

  it('discards changes and goes back to the rules list on Cancel', async () => {
    const history = renderPage();
    await screen.findByTestId('rulesSettingsFlappingSection');

    fireEvent.change(screen.getByTestId('lookBackWindowRangeInput'), { target: { value: 20 } });
    await userEvent.click(screen.getByTestId('rulesSettingsPageCancelButton'));

    expect(updateFlappingSettingsMock).not.toHaveBeenCalled();
    expect(history.location.pathname).toBe('/');
  });

  it('returns to the page it was opened from on Cancel', async () => {
    const history = renderPage('/logs');
    await screen.findByTestId('rulesSettingsFlappingSection');

    await userEvent.click(screen.getByTestId('rulesSettingsPageCancelButton'));

    expect(history.location.pathname).toBe('/logs');
  });

  it('returns to the page it was opened from after saving', async () => {
    const history = renderPage('/logs');
    await screen.findByTestId('rulesSettingsFlappingSection');

    fireEvent.change(screen.getByTestId('lookBackWindowRangeInput'), { target: { value: 20 } });
    await userEvent.click(screen.getByTestId('rulesSettingsPageSaveButton'));

    await waitFor(() => expect(history.location.pathname).toBe('/logs'));
  });

  it('stays on the page while the save is in flight and after it fails', async () => {
    let rejectUpdate: (reason?: unknown) => void = () => {};
    updateFlappingSettingsMock.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectUpdate = reject;
      })
    );
    const history = renderPage('/logs');
    await screen.findByTestId('rulesSettingsFlappingSection');

    fireEvent.change(screen.getByTestId('lookBackWindowRangeInput'), { target: { value: 20 } });
    await userEvent.click(screen.getByTestId('rulesSettingsPageSaveButton'));

    await waitFor(() => expect(updateFlappingSettingsMock).toHaveBeenCalledTimes(1));
    expect(history.location.pathname).toBe('/settings');
    expect(screen.getByTestId('rulesSettingsPageSaveButton')).toBeDisabled();

    await act(async () => {
      rejectUpdate(new Error('boom'));
    });

    await waitFor(() => expect(screen.getByTestId('rulesSettingsPageSaveButton')).toBeEnabled());
    expect(history.location.pathname).toBe('/settings');
  });
});
