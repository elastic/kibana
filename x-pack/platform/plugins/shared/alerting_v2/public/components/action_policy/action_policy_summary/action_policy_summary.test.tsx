/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { getFrequencyLabel, getGroupingModeLabel } from '../labels';
import {
  ActionPolicySummaryBody,
  ActionPolicySummaryDefinitionSection,
  ActionPolicySummaryDestinationsSection,
  ActionPolicySummaryNotificationSection,
  useActionPolicySummary,
  type ActionPolicySummaryData,
} from '.';

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return {
        getUrlForApp: (appId: string, { path }: { path: string }) => `/app/${appId}${path}`,
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_fetch_workflow', () => ({
  useFetchWorkflow: (id: string) => ({
    data: { id, name: `Workflow ${id}`, definition: { steps: [] } },
    isLoading: false,
  }),
}));

const renderSummary = (policy: ActionPolicySummaryData, policyScopeAction?: React.ReactNode) =>
  render(
    <I18nProvider>
      <ActionPolicySummaryBody policy={policy}>
        <ActionPolicySummaryDefinitionSection policyScopeAction={policyScopeAction} />
        <ActionPolicySummaryNotificationSection />
        <ActionPolicySummaryDestinationsSection />
      </ActionPolicySummaryBody>
    </I18nProvider>
  );

describe('ActionPolicySummary', () => {
  describe('useActionPolicySummary', () => {
    it('throws when used outside ActionPolicySummaryBody', () => {
      const Consumer = () => {
        useActionPolicySummary();
        return null;
      };
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => render(<Consumer />)).toThrow(
        'useActionPolicySummary must be used within ActionPolicySummaryBody'
      );

      consoleError.mockRestore();
    });
  });

  describe('with a fully-populated policy', () => {
    const policy: ActionPolicySummaryData = {
      description: 'Notify the on-call team',
      matcher: { tags: ['prod'], expression: 'data.severity : "critical"' },
      grouping: { mode: 'per_field', fields: ['host.name', 'service.name'] },
      throttle: { strategy: 'time_interval', interval: '5m' },
      destinations: [
        { type: 'workflow', id: 'wf-1' },
        { type: 'workflow', id: 'wf-2' },
      ],
    };

    it('renders the summary body with the three sections', () => {
      renderSummary(policy);

      expect(screen.getByTestId('actionPolicySummaryBody')).toBeInTheDocument();
      expect(screen.getByTestId('actionPolicyDetailsFlyoutDefinition')).toBeInTheDocument();
      expect(screen.getByTestId('actionPolicyDetailsFlyoutNotification')).toBeInTheDocument();
      expect(screen.getByTestId('actionPolicyDetailsFlyoutDestinations')).toBeInTheDocument();
    });

    it('renders the description and the policy scope', () => {
      renderSummary(policy);

      expect(screen.getByTestId('actionPolicyDetailsFlyoutDescriptionBlock')).toHaveTextContent(
        'Notify the on-call team'
      );
      expect(screen.getByTestId('actionPolicyDetailsFlyoutPolicyScopeBlock')).toHaveTextContent(
        'prod'
      );
    });

    it('renders the dispatch mode, group by fields and frequency', () => {
      renderSummary(policy);

      expect(screen.getByTestId('actionPolicyDetailsFlyoutDispatchModeBlock')).toHaveTextContent(
        getGroupingModeLabel('per_field')
      );
      const groupBy = screen.getByTestId('actionPolicyDetailsFlyoutGroupByBlock');
      expect(within(groupBy).getByText('host.name')).toBeInTheDocument();
      expect(within(groupBy).getByText('service.name')).toBeInTheDocument();
      expect(screen.getByTestId('actionPolicyDetailsFlyoutFrequencyBlock')).toHaveTextContent(
        getFrequencyLabel({ strategy: 'time_interval', interval: '5m' }, 'per_field')
      );
    });

    it('renders one destination card per destination', () => {
      renderSummary(policy);

      expect(screen.getAllByTestId('actionPolicyDestinationCard')).toHaveLength(2);
      expect(screen.getByText('Workflow wf-1')).toBeInTheDocument();
      expect(screen.getByText('Workflow wf-2')).toBeInTheDocument();
    });
  });

  describe('with an empty policy draft', () => {
    it('renders a fallback for the missing description', () => {
      renderSummary({});

      expect(screen.getByTestId('actionPolicyDetailsFlyoutDescriptionBlock')).toHaveTextContent(
        '-'
      );
    });

    it('describes a missing matcher as matching all alerts', () => {
      renderSummary({});

      expect(screen.getByTestId('actionPolicyDetailsFlyoutPolicyScopeBlock')).toHaveTextContent(
        'This policy matches all alerts.'
      );
    });

    it('renders the not-configured labels for missing grouping and throttle', () => {
      renderSummary({});

      expect(screen.getByTestId('actionPolicyDetailsFlyoutDispatchModeBlock')).toHaveTextContent(
        getGroupingModeLabel(undefined)
      );
      expect(screen.getByTestId('actionPolicyDetailsFlyoutFrequencyBlock')).toHaveTextContent(
        getFrequencyLabel(undefined, undefined)
      );
    });

    it('does not render the group by column', () => {
      renderSummary({});

      expect(screen.queryByTestId('actionPolicyDetailsFlyoutGroupByBlock')).toBeNull();
    });

    it('renders a placeholder instead of destination cards', () => {
      renderSummary({});

      expect(screen.queryByTestId('actionPolicyDestinationCard')).toBeNull();
      expect(screen.getByTestId('actionPolicyDetailsFlyoutDestinations')).toHaveTextContent('-');
    });
  });

  describe('grouping mode', () => {
    it('does not render the group by column for per_alert grouping', () => {
      renderSummary({ grouping: { mode: 'per_alert' } });

      expect(screen.queryByTestId('actionPolicyDetailsFlyoutGroupByBlock')).toBeNull();
    });
  });

  describe('policyScopeAction', () => {
    it('renders the action beside the Policy scope title when provided', () => {
      renderSummary({}, <a data-test-subj="scopeAction">See all affected rules</a>);

      const scopeBlock = screen.getByTestId('actionPolicyDetailsFlyoutPolicyScopeBlock');
      expect(within(scopeBlock).getByTestId('scopeAction')).toBeInTheDocument();
    });

    it('renders no action when not provided', () => {
      renderSummary({});

      expect(screen.queryByTestId('scopeAction')).toBeNull();
    });
  });
});
