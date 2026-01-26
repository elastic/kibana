/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ConfigEditorContent } from './config_editor_content';
import { coreMock } from '@kbn/core/public/mocks';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  FILTERS_FORM_ITEM_SUBJ,
  FILTERS_FORM_SUBJ,
  SOLUTION_SELECTOR_SUBJ,
} from '@kbn/response-ops-alerts-filters-form/constants';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { CONFIG_EDITOR_CLEAR_FILTERS_LABEL } from '../translations';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const core = coreMock.createStart();

jest.mock('@kbn/response-ops-rules-apis/apis/get_internal_rule_types');
const mockGetInternalRuleTypes = jest.mocked(getInternalRuleTypes);
mockGetInternalRuleTypes.mockResolvedValue([
  { id: 'test-o11y-rule-type', name: 'Test o11y rule type', solution: 'observability' },
  { id: 'test-sec-rule-type', name: 'Test sec rule type', solution: 'security' },
] as unknown as InternalRuleType[]);

const { queryClient, provider: TestQueryClientProvider } = createTestResponseOpsQueryClient();

const wrapper = ({ children }: PropsWithChildren) => {
  return (
    <IntlProvider locale="en">
      <TestQueryClientProvider>{children}</TestQueryClientProvider>
    </IntlProvider>
  );
};

describe('ConfigEditorContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it("should not render the filters form if a solution wasn't chosen", async () => {
    render(
      <ConfigEditorContent
        onSave={jest.fn()}
        onCancel={jest.fn()}
        services={core}
        ariaLabelledBy="configEditorFlyout"
      />,
      { wrapper }
    );
    expect(screen.queryByTestId(FILTERS_FORM_SUBJ)).not.toBeInTheDocument();
  });

  it('should not render the filters form while loading rule types', async () => {
    render(
      <ConfigEditorContent
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
        ariaLabelledBy="configEditorFlyout"
      />,
      { wrapper }
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByTestId(FILTERS_FORM_SUBJ)).not.toBeInTheDocument();
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('should reset the (non-empty) filters form when switching solution', async () => {
    render(
      <ConfigEditorContent
        ariaLabelledBy="configEditorFlyout"
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
      />,
      { wrapper }
    );
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId(SOLUTION_SELECTOR_SUBJ)).getByRole('button'));
    await userEvent.click(screen.getByRole('option', { name: 'Security' }));
    expect(screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ)).toHaveLength(1);
  });

  it("should reset the filters form when clicking on 'Clear all'", async () => {
    render(
      <ConfigEditorContent
        ariaLabelledBy="configEditorFlyout"
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
      />,
      { wrapper }
    );
    expect(await screen.findByTestId(FILTERS_FORM_SUBJ)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: CONFIG_EDITOR_CLEAR_FILTERS_LABEL }));
    expect(screen.getAllByTestId(FILTERS_FORM_ITEM_SUBJ)).toHaveLength(1);
  });
});
