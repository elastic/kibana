/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { screen, render, waitFor } from '@testing-library/react';
import { AlertFilterControls } from '@kbn/alerts-ui-shared/src/alert_filter_controls';
import { SPACE_IDS } from '@kbn/rule-data-utils';
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

vi.mock('@kbn/alerts-ui-shared/src/alert_filter_controls');
vi.mock('./alerts_search_bar');
vi.mock('../../../common/lib/kibana');
vi.mock('./use_alert_search_bar_state_container', async () => {
      const mocked = {
      ...(await vi.importActual('./use_alert_search_bar_state_container')),
      useAlertSearchBarStateContainer: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

vi.mocked(useKibana).mockReturnValue({
  services: {
    ...createStartServicesMock(),
    notifications: notificationServiceMock.createStartContract(),
  },
} as unknown as ReturnType<typeof useKibana>);

vi.mocked(AlertsSearchBar).mockReturnValue(<div>AlertsSearchBar</div>);

const mockStateContainerDefaults = {
  kuery: '',
  onKueryChange: vi.fn(),
  filters: [],
  onFiltersChange: vi.fn(),
  rangeFrom: 'now-15m',
  onRangeFromChange: vi.fn(),
  rangeTo: 'now',
  onRangeToChange: vi.fn(),
  filterControls: [],
  onFilterControlsChange: vi.fn(),
  savedQuery: undefined,
  setSavedQuery: vi.fn(),
  clearSavedQuery: vi.fn(),
};

const defaultProps = {
  appName: 'test',
  onEsQueryChange: vi.fn(),
  onFilterControlsChange: vi.fn(),
};

const TestComponent = (propOverrides: Partial<UrlSyncedAlertsSearchBarProps>) => (
  <Provider value={alertSearchBarStateContainer}>
    <UrlSyncedAlertsSearchBar {...defaultProps} {...propOverrides} />
  </Provider>
);

describe('UrlSyncedAlertsSearchBar', () => {
  beforeEach(() => {
    vi.mocked(useAlertSearchBarStateContainer).mockReturnValue(mockStateContainerDefaults);
  });

  it('should not show the filter controls when the showFilterControls toggle is off', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent />);
    expect(screen.queryByText('AlertFilterControls')).not.toBeInTheDocument();
  });

  it('should show the filter controls when the showFilterControls toggle is on', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent showFilterControls />);
    expect(screen.getByText('AlertFilterControls')).toBeInTheDocument();
  });

  it('should use filterControlsStorageKey as storageKey prefix when provided', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    render(<TestComponent showFilterControls filterControlsStorageKey="ruleDetailsAlerts" />);
    expect(vi.mocked(AlertFilterControls)).toHaveBeenCalledWith(
      expect.objectContaining({ storageKey: 'ruleDetailsAlerts.filterControls' }),
      expect.anything()
    );
  });

  it('forwards onFilterControlsChange and onControlApiAvailable to AlertFilterControls', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    const onFilterControlsChange = vi.fn();
    const onControlApiAvailable = vi.fn();
    render(
      <TestComponent
        showFilterControls
        onFilterControlsChange={onFilterControlsChange}
        onControlApiAvailable={onControlApiAvailable}
      />
    );
    expect(vi.mocked(AlertFilterControls)).toHaveBeenCalledWith(
      expect.objectContaining({
        onFiltersChange: onFilterControlsChange,
        onInit: onControlApiAvailable,
      }),
      expect.anything()
    );
  });

  it('wires setControlsUrlState to the URL state container so config edits round-trip', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    const onFilterControlsConfigChange = vi.fn();
    vi.mocked(useAlertSearchBarStateContainer).mockReturnValue({
      ...mockStateContainerDefaults,
      onFilterControlsChange: onFilterControlsConfigChange,
    });
    render(<TestComponent showFilterControls />);
    expect(vi.mocked(AlertFilterControls)).toHaveBeenCalledWith(
      expect.objectContaining({ setControlsUrlState: onFilterControlsConfigChange }),
      expect.anything()
    );
  });

  it('builds the ES query from page-supplied filterControls', () => {
    vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    const onEsQueryChange = vi.fn();
    const filterControls = [
      {
        meta: { key: ALERT_STATUS, params: { query: 'active' } },
        query: { match_phrase: { [ALERT_STATUS]: 'active' } },
      },
    ];
    render(
      <TestComponent
        showFilterControls
        filterControls={filterControls}
        onEsQueryChange={onEsQueryChange}
      />
    );
    const lastCall = onEsQueryChange.mock.calls[onEsQueryChange.mock.calls.length - 1][0];
    expect(JSON.stringify(lastCall)).toContain(ALERT_STATUS);
  });

  describe('defaultFilterControls', () => {
    beforeEach(() => {
      vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
    });

    const statusOnlyControls = [{ field_name: ALERT_STATUS, title: 'Status' }];

    it('passes defaultFilterControls as defaultControls to AlertFilterControls', () => {
      render(<TestComponent showFilterControls defaultFilterControls={statusOnlyControls} />);
      expect(vi.mocked(AlertFilterControls)).toHaveBeenCalledWith(
        expect.objectContaining({ defaultControls: statusOnlyControls }),
        expect.anything()
      );
    });

    it('passes all URL-state controls through when defaultFilterControls is not set', () => {
      const urlControls = [
        { field_name: ALERT_STATUS, title: 'Status', selected_options: ['active'] },
        { field_name: ALERT_RULE_NAME, title: 'Rule', selected_options: ['My Rule'] },
      ];
      vi.mocked(useAlertSearchBarStateContainer).mockReturnValue({
        ...mockStateContainerDefaults,
        filterControls: urlControls,
      });

      render(<TestComponent showFilterControls />);

      const calls = vi.mocked(AlertFilterControls).mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.controlsUrlState).toEqual(urlControls);
    });
  });

  describe('space filtering', () => {
    afterEach(() => {
      vi.mocked(useKibana).mockReturnValue({
        services: {
          ...createStartServicesMock(),
          notifications: notificationServiceMock.createStartContract(),
        },
      } as unknown as ReturnType<typeof useKibana>);
    });

    it('passes a space filter to AlertFilterControls when spaceId is available', async () => {
      vi.mocked(AlertFilterControls).mockImplementation(() => <div>AlertFilterControls</div>);
      vi.mocked(useKibana).mockReturnValue({
        services: {
          ...createStartServicesMock(),
          notifications: notificationServiceMock.createStartContract(),
          spaces: { getActiveSpace: () => Promise.resolve({ id: 'my-space' }) },
        },
      } as unknown as ReturnType<typeof useKibana>);

      render(<TestComponent showFilterControls />);

      await waitFor(() => {
        const calls = vi.mocked(AlertFilterControls).mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall.filters).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              meta: expect.objectContaining({ key: SPACE_IDS, params: { query: 'my-space' } }),
              query: { match_phrase: { [SPACE_IDS]: 'my-space' } },
            }),
          ])
        );
      });
    });
  });

  describe('when the filter controls bar throws an error', () => {
    beforeAll(() => {
      vi.mocked(AlertFilterControls).mockImplementation(() => {
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
