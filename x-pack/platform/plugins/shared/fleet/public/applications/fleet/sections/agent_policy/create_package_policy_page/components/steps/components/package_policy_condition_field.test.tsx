/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { PackagePolicyConditionField } from './package_policy_condition_field';

jest.mock('../../../../../../hooks', () => ({
  useStartServices: () => ({
    docLinks: { links: { fleet: { elasticAgentInputConditions: 'https://conditions' } } },
  }),
}));

const renderField = (
  props: Partial<React.ComponentProps<typeof PackagePolicyConditionField>> = {}
) => {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <PackagePolicyConditionField
        value=""
        onChange={onChange}
        isInvalid={false}
        errors={null}
        {...props}
      />
    </I18nProvider>
  );
  return { onChange, input: screen.getByTestId('packagePolicyConditionInput') };
};

describe('PackagePolicyConditionField', () => {
  it('shows the help text under the field', () => {
    renderField();

    expect(screen.getByText(/Only collect data when this condition is met/)).toBeInTheDocument();
    expect(screen.getByText('Learn more').closest('a')).toHaveAttribute(
      'href',
      'https://conditions'
    );
    expect(screen.queryByTestId('packagePolicyConditionInput-helpTooltip')).not.toBeInTheDocument();
  });

  it('moves the help text to a tooltip and keeps the link under the field', () => {
    renderField({ helpTextAsTooltip: true });

    expect(screen.getByTestId('packagePolicyConditionInput-helpTooltip')).toBeInTheDocument();
    expect(screen.queryByText(/Only collect data when this condition is met/)).toBeNull();
    expect(screen.getByText('Learn more')).toBeInTheDocument();
  });

  it('reports an edit, and null once cleared', () => {
    const { onChange, input } = renderField({ value: 'x' });

    fireEvent.change(input, { target: { value: '${host.platform} == "linux"' } });
    expect(onChange).toHaveBeenCalledWith('${host.platform} == "linux"');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('shows the errors', () => {
    renderField({ isInvalid: true, errors: ['Line 1, column 5: syntax error'] });

    expect(screen.getByText('Line 1, column 5: syntax error')).toBeInTheDocument();
  });
});
