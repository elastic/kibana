/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, render } from '@testing-library/react';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import {
  UrlSyncedAlertsSearchBar,
  UrlSyncedAlertsSearchBarProps,
} from './url_synced_alerts_search_bar';
import { useKibana } from '../../../common/lib/kibana';
import { alertSearchBarStateContainer, Provider } from './use_alert_search_bar_state_container';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { AlertsSearchBar } from './alerts_search_bar';
import userEvent from '@testing-library/user-event';
import { RESET_FILTER_CONTROLS_TEST_SUBJ } from './constants';

const FILTER_CONTROLS_LOCAL_STORAGE_KEY = 'alertsSearchBar.filterControls';

jest.mock('@kbn/alerts-ui-shared/src/alert_filter_controls');
jest.mock('./alerts_search_bar');
jest.mock('../../../common/lib/kibana');

jest.mocked(useKibana).mockReturnValue({
  services: {
    ...createStartServicesMock(),
    notifications: notificationServiceMock.createStartContract(),
  },
} as unknown as ReturnType<typeof useKibana>);

jest.mocked(AlertsSearchBar).mockReturnValue(<div>AlertsSearchBar</div>);

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
