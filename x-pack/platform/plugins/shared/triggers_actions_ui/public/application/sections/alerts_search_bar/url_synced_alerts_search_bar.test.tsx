/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { ALERT_RULE_NAME, ALERT_STATUS } from '@kbn/rule-data-utils';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import type { UrlSyncedAlertsSearchBarProps } from './url_synced_alerts_search_bar';
import { UrlSyncedAlertsSearchBar } from './url_synced_alerts_search_bar';
import { useKibana } from '../../../common/lib/kibana';
import {
  alertSearchBarStateContainer,
  Provider,
  useAlertSearchBarStateContainer,
} from './use_alert_search_bar_state_container';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { AlertsSearchBar } from './alerts_search_bar';
import userEvent from '@testing-library/user-event';
import { RESET_FILTER_CONTROLS_TEST_SUBJ } from './constants';

const FILTER_CONTROLS_LOCAL_STORAGE_KEY = 'alertsSearchBar.filterControls';

jest.mock('@kbn/alerts-ui-shared/src/alert_filter_controls');
jest.mock('./alerts_search_bar');
jest.mock('../../../common/lib/kibana');
jest.mock('./use_alert_search_bar_state_container', () => ({
  ...jest.requireActual('./use_alert_search_bar_state_container'),
  useAlertSearchBarStateContainer: jest.fn(),
}));

jest.mocked(useKibana).mockReturnValue({
  services: {
    ...createStartServicesMock(),
    notifications: notificationServiceMock.createStartContract(),
  },
} as unknown as ReturnType<typeof useKibana>);

jest.mocked(AlertsSearchBar).mockReturnValue(<div>AlertsSearchBar</div>);

const mockStateContainerDefaults = {
  kuery: '',
  onKueryChange: jest.fn(),
  filters: [],
  onFiltersChange: jest.fn(),
  controlFilters: [],
  onControlFiltersChange: jest.fn(),
  rangeFrom: 'now-15m',
  onRangeFromChange: jest.fn(),
  rangeTo: 'now',
  onRangeToChange: jest.fn(),
  filterControls: [],
  onFilterControlsChange: jest.fn(),
  savedQuery: undefined,
  setSavedQuery: jest.fn(),
  clearSavedQuery: jest.fn(),
};

const defaultProps = {
  appName: 'test',
  onEsQueryChange: jest.fn(),
};

const TestComponent = (propOverrides: Partial<UrlSyncedAlertsSearchBarProps>) => (
  <Provider value={alertSearchBarStateContainer}>
    <UrlSyncedAlertsSearchBar {...defaultProps} {...propOverrides} />
  </Provider>
);

describe('UrlSyncedAlertsSearchBar', () => {
  beforeEach(() => {
    jest.mocked(useAlertSearchBarStateContainer).mockReturnValue(mockStateContainerDefaults);
  });

  it('should not show the filter controls when the showFilterControls toggle is off', () => {
    jest.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent />);
    expect(screen.queryByText('AlertFilterControls')).not.toBeInTheDocument();
  });

  it('should show the filter controls when the showFilterControls toggle is on', () => {
    jest.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent showFilterControls />);
    expect(screen.getByText('AlertFilterControls')).toBeInTheDocument();
  });

  it('should use filterControlsStorageKey as storageKey prefix when provided', () => {
    jest.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent showFilterControls filterControlsStorageKey="ruleDetailsAlerts" />);
    expect(jest.mocked(AlertFilterControls)).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey: 'ruleDetailsAlerts.filterControls' }),
      expect.anything()
    );
  });

  describe('defaultFilterControls', () => {
    beforeEach(() => {
      jest.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    });

    const statusOnlyControls = [{ field_name: ALERT_STATUS, title: 'Status' }];

    it('passes defaultFilterControls as defaultControls to AlertFilterControls', () => {
      render(<TestComponent showFilterControls defaultFilterControls={statusOnlyControls} />);
      expect(jest.mocked(AlertFilterControls)).toHaveBeenCalledWith(
        expect.objectContaining({ defaultControls: statusOnlyControls }),
        expect.anything()
      );
    });

    it('passes all URL-state controls through when defaultFilterControls is not set', () => {
      const urlControls = [
        { field_name: ALERT_STATUS, title: 'Status', selected_options: ['active'] },
        { field_name: ALERT_RULE_NAME, title: 'Rule', selected_options: ['My Rule'] },
      ];
      jest.mocked(useAlertSearchBarStateContainer).mockReturnValue({
        ...mockStateContainerDefaults,
        filterControls: urlControls,
      });

      render(<TestComponent showFilterControls />);

      const calls = jest.mocked(AlertFilterControls).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.controlsUrlState).toEqual(urlControls);
    });
  });

  describe('when the filter controls bar throws an error', () => {
    beforeAll(() => {
      jest.mocked(AlertFilterControls).mockImplementation(() => {
        throw new Error('test error');
      });
    });

    it('should catch filter control errors locally and show a fallback view', () => {
      render(<TestComponent showFilterControls />);
      expect(screen.getByText('Cannot render alert filters')).toBeInTheDocument();
    });

    it('should remove the correct localStorage item when resetting filter controls', async () => {
      window.localStorage.setItem(FILTER_CONTROLS_LOCAL_STORAGE_KEY, '{}');
      render(<TestComponent showFilterControls />);
      await userEvent.click(await screen.findByTestId(RESET_FILTER_CONTROLS_TEST_SUBJ));
      expect(window.localStorage.getItem(FILTER_CONTROLS_LOCAL_STORAGE_KEY)).toBeNull();
    });
  });
});
