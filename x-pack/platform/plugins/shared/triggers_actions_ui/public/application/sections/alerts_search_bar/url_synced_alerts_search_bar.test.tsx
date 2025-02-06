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
import { UrlSyncedAlertsSearchBar } from './url_synced_alerts_search_bar';
import { useKibana } from '../../../common/lib/kibana';
import { alertSearchBarStateContainer, Provider } from './use_alert_search_bar_state_container';
import { createStartServicesMock } from '../../../common/lib/kibana/kibana_react.mock';
import { AlertsSearchBar } from './alerts_search_bar';

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

const props = {
  appName: 'test',
  onEsQueryChange: jest.fn(),
};

describe('UrlSyncedAlertsSearchBar', () => {
  it('should show the filter controls when the showFilterControls toggle is on', () => {
    jest.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(
      <Provider value={alertSearchBarStateContainer}>
        <UrlSyncedAlertsSearchBar {...props} showFilterControls />
      </Provider>
    );
    expect(screen.getByText('AlertFilterControls')).toBeInTheDocument();
  });

  it('should catch filter control errors locally and show a fallback view', () => {
    jest.mocked(AlertFilterControls).mockImplementation(() => {
      throw new Error('test error');
    });
    render(
      <Provider value={alertSearchBarStateContainer}>
        <UrlSyncedAlertsSearchBar {...props} showFilterControls />
      </Provider>
    );
    expect(screen.getByText('Cannot render alert filters')).toBeInTheDocument();
  });
});
