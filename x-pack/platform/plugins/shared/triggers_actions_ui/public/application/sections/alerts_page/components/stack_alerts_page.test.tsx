/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import {
  STACK_ALERTS_ONLY_FEATURE_ID,
  OBSERVABILITY_ALERTS_FEATURE_ID,
} from '@kbn/rule-data-utils';
import { fetchAlertsFields } from '@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields';
import { alertsTableQueryClient } from '@kbn/response-ops-alerts-table/query_client';
import { StackAlertsPage } from './stack_alerts_page';
import { getIsExperimentalFeatureEnabled } from '../../../../common/get_experimental_features';
import { createAppMockRenderer } from '../../test_utils';
import { ruleTypesIndex } from '../../../mock/rule_types_index';
import { getRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';

jest.mock('@kbn/response-ops-rules-apis/apis/get_rule_types');
const mockLoadRuleTypes = jest
  .mocked(getRuleTypes)
  .mockResolvedValue(Array.from(ruleTypesIndex.values()));

jest.mock('@kbn/response-ops-rules-apis/apis/get_internal_rule_types');
const mockLoadInternalRuleTypes = jest
  .mocked(getInternalRuleTypes)
  .mockResolvedValue(Array.from(ruleTypesIndex.values()) as never);

jest.mock('@kbn/alerts-ui-shared/src/common/apis/fetch_alerts_fields');
jest.mocked(fetchAlertsFields).mockResolvedValue({ browserFields: {}, fields: [] });

jest.mock('../../alerts_search_bar/url_synced_alerts_search_bar', () => {
  const ReactLib = jest.requireActual('react');
  return {
    UrlSyncedAlertsSearchBar: ({
      onFilterControlsChange,
      onControlApiAvailable,
      onFilterSelected,
    }: {
      onFilterControlsChange?: (filters: unknown[]) => void;
      onControlApiAvailable?: (api: unknown) => void;
      onFilterSelected?: (filters: unknown[]) => void;
    }) => {
      ReactLib.useEffect(() => {
        onControlApiAvailable?.({});
        onFilterControlsChange?.([]);
        onFilterSelected?.([]);
      }, [onControlApiAvailable, onFilterControlsChange, onFilterSelected]);
      return ReactLib.createElement(
        'div',
        { 'data-test-subj': 'urlSyncedAlertsSearchBar' },
        'UrlSyncedAlertsSearchBar'
      );
    },
  };
});

// Not using `jest.mocked` here because the `AlertsTable` component is manually typed to ensure
// correct type inference, but it's actually a `memo(forwardRef())` component, which is hard to mock
const mockAlertsTable = jest.fn(({ ruleTypeIds }: { ruleTypeIds?: string[] }) => (
  <div data-test-subj="alertsTable" data-rule-type-ids={JSON.stringify(ruleTypeIds)}>
    Alerts table
  </div>
));
jest.mock('@kbn/response-ops-alerts-table/components/alerts_table', () => ({
  AlertsTable: (props: { ruleTypeIds?: string[] }) => mockAlertsTable(props),
}));

jest.mock('../../../../common/get_experimental_features');
jest.mocked(getIsExperimentalFeatureEnabled).mockReturnValue(false);

describe('StackAlertsPage', () => {
  const appMockRender = createAppMockRenderer({
    additionalServices: {},
  });

  beforeEach(() => {
    // Reset to the full list so tests that only override the external rule types
    // API still receive the alert-authorized list from the internal endpoint.
    mockLoadInternalRuleTypes.mockResolvedValue(Array.from(ruleTypesIndex.values()) as never);
  });

  afterEach(() => {
    appMockRender.queryClient.clear();
    alertsTableQueryClient.clear();
    mockAlertsTable.mockClear();
  });

  it('renders the stack alerts page with the correct permissions', async () => {
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('stackAlertsPageContent')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(await screen.findByTestId('urlSyncedAlertsSearchBar')).toBeInTheDocument();
  });

  it('shows the missing permission prompt if the user is not allowed to read any rules', async () => {
    mockLoadRuleTypes.mockResolvedValue([]);
    mockLoadInternalRuleTypes.mockResolvedValue([] as never);
    appMockRender.render(<StackAlertsPage />);

    expect(await screen.findByTestId('noPermissionPrompt')).toBeInTheDocument();
  });

  it('sources rule type ids from the internal endpoint for alerts-only users', async () => {
    // The rule types API (rule-read) returns nothing, but the internal endpoint
    // returns the alert-authorized rule types.
    mockLoadRuleTypes.mockResolvedValue([]);
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      [STACK_ALERTS_ONLY_FEATURE_ID]: { show: true },
    };
    const renderer = createAppMockRenderer({
      additionalServices: { application: core.application },
    });
    renderer.render(<StackAlertsPage />);

    const table = await screen.findByTestId('alertsTable');
    const ruleTypeIds = JSON.parse(table.getAttribute('data-rule-type-ids') ?? '[]');
    expect(ruleTypeIds.length).toBeGreaterThan(0);
  });

  it('renders the page when the user only has the Stack Alerts read capability', async () => {
    mockLoadRuleTypes.mockResolvedValue([]);
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      [STACK_ALERTS_ONLY_FEATURE_ID]: { show: true },
    };
    const renderer = createAppMockRenderer({
      additionalServices: { application: core.application },
    });
    renderer.render(<StackAlertsPage />);

    expect(await screen.findByTestId('stackAlertsPageContent')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(screen.queryByTestId('noPermissionPrompt')).not.toBeInTheDocument();
  });

  it('renders the page when the user only has the Observability Alerts read capability', async () => {
    mockLoadRuleTypes.mockResolvedValue([]);
    const core = coreMock.createStart();
    core.application.capabilities = {
      ...core.application.capabilities,
      [OBSERVABILITY_ALERTS_FEATURE_ID]: { show: true },
    };
    const renderer = createAppMockRenderer({
      additionalServices: { application: core.application },
    });
    renderer.render(<StackAlertsPage />);

    expect(await screen.findByTestId('stackAlertsPageContent')).toBeInTheDocument();
    expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
    expect(screen.queryByTestId('noPermissionPrompt')).not.toBeInTheDocument();
  });

  describe('alert details navigation based on observability access', () => {
    // Independent of the observability-access gate under test: keep the page's own
    // "authorized to read any rules" check satisfied so the alerts table renders.
    beforeEach(() => {
      mockLoadRuleTypes.mockResolvedValue(Array.from(ruleTypesIndex.values()));
    });

    const noObservabilityAccessCapabilities = (core: ReturnType<typeof coreMock.createStart>) => ({
      ...core.application.capabilities,
      navLinks: {
        ...core.application.capabilities.navLinks,
        apm: false,
        metrics: false,
        uptime: false,
        synthetics: false,
        slo: false,
      },
      logs: { show: false },
      [STACK_ALERTS_ONLY_FEATURE_ID]: { show: false },
      [OBSERVABILITY_ALERTS_FEATURE_ID]: { show: false },
    });

    it('does not set alertDetailsNavigation when the user has no observability capabilities', async () => {
      const core = coreMock.createStart();
      core.application.capabilities = noObservabilityAccessCapabilities(core);
      const renderer = createAppMockRenderer({
        additionalServices: { application: core.application },
      });
      renderer.render(<StackAlertsPage />);

      expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
      expect(mockAlertsTable).toHaveBeenCalledWith(
        expect.objectContaining({ alertDetailsNavigation: undefined })
      );
    });

    it('sets alertDetailsNavigation when the user has the observabilityAlerts capability', async () => {
      const core = coreMock.createStart();
      core.application.capabilities = {
        ...noObservabilityAccessCapabilities(core),
        [OBSERVABILITY_ALERTS_FEATURE_ID]: { show: true },
      };
      const renderer = createAppMockRenderer({
        additionalServices: { application: core.application },
      });
      renderer.render(<StackAlertsPage />);

      expect(await screen.findByTestId('alertsTable')).toBeInTheDocument();
      expect(mockAlertsTable).toHaveBeenCalledWith(
        expect.objectContaining({
          alertDetailsNavigation: expect.objectContaining({ appId: 'observability' }),
        })
      );
    });
  });
});
