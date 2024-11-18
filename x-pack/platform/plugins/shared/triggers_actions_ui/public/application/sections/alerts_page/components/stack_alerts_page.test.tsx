/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { screen } from '@testing-library/react';

import { StackAlertsPage } from './stack_alerts_page';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { createAppMockRenderer } from '../../test_utils';
import { ruleTypesIndex } from '../../../mock/rule_types_index';
import { loadRuleTypes } from '../../../lib/rule_api/rule_types';

jest.mock('../../../lib/rule_api/rule_types');
const mockLoadRuleTypes = jest
  .mocked(loadRuleTypes)
  .mockResolvedValue(Array.from(ruleTypesIndex.values()));

jest.mock('../../alerts_search_bar/url_synced_alerts_search_bar', () => ({
  UrlSyncedAlertsSearchBar: () => (
    <div data-test-subj="urlSyncedAlertsSearchBar">{'UrlSyncedAlertsSearchBar'}</div>
  ),
}));

jest.mock('../../alerts_table/alerts_data_grid', () => ({
  AlertsDataGrid: jest.fn(() => <div data-test-subj="alertsTable">{'Alerts table'}</div>),
}));

jest.mock('../../../../common/get_experimental_features');
jest.mocked(getIsExperimentalFeatureEnabled).mockReturnValue(false);

describe('StackAlertsPage', () => {
  const appMockRender = createAppMockRenderer({
    additionalServices: {},
  });

  it('renders the stack alerts page with the correct permissions', async () => {
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('stackAlertsPageContent')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(await screen.findByTestId('urlSyncedAlertsSearchBar')).toBeInTheDocument();
  });

  it('shows the missing permission prompt if the user is not allowed to read any rules', async () => {
    mockLoadRuleTypes.mockResolvedValue([]);
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('noPermissionPrompt')).toBeInTheDocument();
  });
});
