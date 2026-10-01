/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import type { ApiSelectorsByTarget } from '../../../hooks/agents/use_api_selectors';
import { AutoApprovedApisField, type AutoApprovedApisFieldProps } from './auto_approved_apis_field';

const mockSelectors: ApiSelectorsByTarget = {
  elasticsearch: ['*', 'indices.*', 'indices.create', 'indices.delete'],
  kibana: ['*', 'alerting.*', 'alerting.delete-alerting-rule-id'],
};
let mockSelectorsByTarget: ApiSelectorsByTarget | undefined = mockSelectors;

jest.mock('../../../hooks/agents/use_api_selectors', () => ({
  useApiSelectors: () => ({
    selectorsByTarget: mockSelectorsByTarget,
    isLoading: mockSelectorsByTarget === undefined,
  }),
}));

const onChange = jest.fn();

const renderField = (props: Partial<AutoApprovedApisFieldProps> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <AutoApprovedApisField value={{}} onChange={onChange} isDisabled={false} {...props} />
      </IntlProvider>
    </EuiProvider>
  );

const openComboBox = async (target: 'elasticsearch' | 'kibana') =>
  userEvent.click(
    within(screen.getByTestId(`agentBuilderAutoApprovedApis-${target}`)).getByTestId(
      'comboBoxToggleListButton'
    )
  );

describe('AutoApprovedApisField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectorsByTarget = mockSelectors;
  });

  it('lists the lazily loaded selectors of the backend', async () => {
    renderField();

    await openComboBox('elasticsearch');

    expect(
      await screen.findByTestId('agentBuilderAutoApprovedApiOption-elasticsearch-*')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agentBuilderAutoApprovedApiOption-elasticsearch-indices.*')
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('agentBuilderAutoApprovedApiOption-elasticsearch-indices.delete')
    ).toBeInTheDocument();
  });

  it('lists the selectors ungrouped, from broadest to narrowest', async () => {
    renderField();

    await openComboBox('elasticsearch');

    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      '*',
      'indices.*',
      'indices.create',
      'indices.delete',
    ]);
  });

  it('reports both backends when one of them changes', async () => {
    renderField({ value: { kibana: ['alerting.delete-alerting-rule-id'] } });

    await openComboBox('elasticsearch');
    await userEvent.click(
      await screen.findByTestId('agentBuilderAutoApprovedApiOption-elasticsearch-indices.delete')
    );

    expect(onChange).toHaveBeenLastCalledWith({
      elasticsearch: ['indices.delete'],
      kibana: ['alerting.delete-alerting-rule-id'],
    });
  });

  it('keeps the stored selectors visible while the selectors are loading', () => {
    mockSelectorsByTarget = undefined;

    renderField({ value: { elasticsearch: ['indices.delete'] } });

    expect(
      within(screen.getByTestId('agentBuilderAutoApprovedApis-elasticsearch')).getByText(
        'indices.delete'
      )
    ).toBeInTheDocument();
  });

  it('explains why the field is disabled', () => {
    renderField({ isDisabled: true, disabledReason: 'Only administrators can set these.' });

    expect(screen.getByTestId('agentBuilderAutoApprovedApisHelpText')).toHaveTextContent(
      'Only administrators can set these.'
    );
  });
});
