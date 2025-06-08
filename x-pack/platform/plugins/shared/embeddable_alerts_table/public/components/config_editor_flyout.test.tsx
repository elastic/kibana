/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConfigEditorFlyout } from './config_editor_flyout';
import { coreMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  FILTERS_FORM_ITEM_SUBJ,
  FILTERS_FORM_SUBJ,
  SOLUTION_SELECTOR_SUBJ,
} from '@kbn/response-ops-alerts-filters-form/constants';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { CONFIG_EDITOR_CLEAR_FILTERS_LABEL } from '../translations';

const core = coreMock.createStart();

jest.mock('@kbn/response-ops-rules-apis/apis/get_internal_rule_types');
const mockGetInternalRuleTypes = jest.mocked(getInternalRuleTypes);
mockGetInternalRuleTypes.mockResolvedValue([
  { id: 'test-o11y-rule-type', name: 'Test o11y rule type', solution: 'observability' },
  { id: 'test-sec-rule-type', name: 'Test sec rule type', solution: 'security' },
] as unknown as InternalRuleType[]);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {},
  },
});

describe('ConfigEditorFlyout', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("should not render the filters form if a solution wasn't chosen", async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout onSave={jest.fn()} onCancel={jest.fn()} services={core} />
        </QueryClientProvider>
      </IntlProvider>
    );
    expect(screen.queryByTestId(FILTERS_FORM_SUBJ)).not.toBeInTheDocument();
  });

  it('should not render the filters form while loading rule types', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout
            onSave={jest.fn()}
            onCancel={jest.fn()}
            initialConfig={{
              solution: 'observability',
              query: {
                type: 'alertsFilters',
                filters: [{ filter: {} }],
              },
            }}
            services={core}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId(FILTERS_FORM_SUBJ)).not.toBeInTheDocument();
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should reset the (non-empty) filters form when switching solution', async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout
            onSave={jest.fn()}
            onCancel={jest.fn()}
            initialConfig={{
              solution: 'observability',
              query: {
                type: 'alertsFilters',
                filters: [{ filter: { type: 'ruleTypes', value: ['test-o11y-rule-type'] } }],
              },
            }}
            services={core}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId(SOLUTION_SELECTOR_SUBJ)).getByRole('button'));
    await userEvent.click(screen.getByRole('option', { name: 'Security' }));
    expect(screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ)).toHaveLength(1);
  });

  it("should reset the filters form when clicking on 'Clear all'", async () => {
    render(
      <IntlProvider locale="en">
        <QueryClientProvider client={queryClient}>
          <ConfigEditorFlyout
            onSave={jest.fn()}
            onCancel={jest.fn()}
            initialConfig={{
              solution: 'observability',
              query: {
                type: 'alertsFilters',
                filters: [
                  { filter: { type: 'ruleTypes', value: ['test-o11y-rule-type'] } },
                  { operator: 'and' },
                  { filter: { type: 'ruleTypes', value: ['test-o11y-rule-type'] } },
                ],
              },
            }}
            services={core}
          />
        </QueryClientProvider>
      </IntlProvider>
    );
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONFIG_EDITOR_CLEAR_FILTERS_LABEL }));
    expect(screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ)).toHaveLength(1);
  });
});
