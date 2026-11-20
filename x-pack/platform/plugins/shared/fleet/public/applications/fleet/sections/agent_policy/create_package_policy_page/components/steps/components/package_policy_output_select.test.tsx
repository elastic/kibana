/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { PackagePolicyOutputSelect } from './package_policy_output_select';

const renderSelect = (
  props: Partial<React.ComponentProps<typeof PackagePolicyOutputSelect>> = {}
) => {
  const onChange = jest.fn();
  render(
    <I18nProvider>
      <PackagePolicyOutputSelect
        onChange={onChange}
        allowedOutputs={[{ id: 'logstash-1', name: 'My Logstash' }]}
        {...props}
      />
    </I18nProvider>
  );
  return { onChange, select: screen.getByTestId('packagePolicyOutputInput') };
};

describe('PackagePolicyOutputSelect', () => {
  it('selects the inherited output when none is set', () => {
    const { select } = renderSelect({ outputId: null });

    expect(select).toHaveValue('');
    expect(screen.getByText('Inherited from agent policy')).toBeInTheDocument();
  });

  it('names the inherited output when known', () => {
    renderSelect({ inheritedOutputName: 'Default' });

    expect(screen.getByText('Inherited from agent policy (currently Default)')).toBeInTheDocument();
  });

  it('reports the chosen output, and null for the inherited one', () => {
    const { onChange, select } = renderSelect({ outputId: 'logstash-1' });

    expect(select).toHaveValue('logstash-1');
    fireEvent.change(select, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('is disabled with an explanation for a managed agent policy', () => {
    const { select } = renderSelect({ isDisabled: true });

    expect(select).toBeDisabled();
  });
});
