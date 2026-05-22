/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { RuleAlertSearchBar } from './rule_alert_search_bar';
import { UrlSyncedAlertsSearchBar } from '../../alerts_search_bar/url_synced_alerts_search_bar';
import {
  RULE_DETAILS_ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY,
  RULE_DETAILS_FILTER_CONTROLS_STORAGE_KEY,
} from '../../alerts_search_bar/constants';

jest.mock('../../alerts_search_bar/url_synced_alerts_search_bar', () => ({
  UrlSyncedAlertsSearchBar: jest.fn(() => <div data-test-subj="urlSyncedAlertsSearchBar" />),
}));

describe('RuleAlertSearchBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wires rule-details alert search bar props correctly', () => {
    const onEsQueryChange = jest.fn();

    render(<RuleAlertSearchBar ruleTypeId="my.rule.type" onEsQueryChange={onEsQueryChange} />);

    expect(screen.getByTestId('ruleDetailsAlertsSearchBarRow')).toBeInTheDocument();
    expect(screen.getByTestId('urlSyncedAlertsSearchBar')).toBeInTheDocument();

    expect(UrlSyncedAlertsSearchBar).toHaveBeenCalledWith(
      expect.objectContaining({
        appName: 'StackRuleDetailsAlerts',
        ruleTypeIds: ['my.rule.type'],
        showFilterBar: true,
        showFilterControls: true,
        showDatePicker: true,
        showSubmitButton: true,
        urlStorageKey: RULE_DETAILS_ALERTS_SEARCH_BAR_PARAMS_URL_STORAGE_KEY,
        filterControlsStorageKey: RULE_DETAILS_FILTER_CONTROLS_STORAGE_KEY,
        onEsQueryChange,
      }),
      expect.anything()
    );
  });

  it('excludes the Rule filter control from defaultFilterControls', () => {
    render(<RuleAlertSearchBar ruleTypeId="my.rule.type" onEsQueryChange={jest.fn()} />);

    const [props] = jest.mocked(UrlSyncedAlertsSearchBar).mock.calls[0];
    const { defaultFilterControls } = props as unknown as {
      defaultFilterControls: Array<{ field_name: string }>;
    };

    expect(defaultFilterControls).toBeDefined();
    expect(defaultFilterControls.some((c) => c.field_name === ALERT_RULE_NAME)).toBe(false);
  });
});
