/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import type { InputFieldProps } from './package_policy_input_var_field';
import { PackagePolicyInputVarField } from './package_policy_input_var_field';

jest.mock('@kbn/code-editor', () => ({ CodeEditor: () => null }));
jest.mock('../../../../../../../../hooks', () => ({
  useFleetStatus: () => ({ isReady: false, isSecretsStorageEnabled: false }),
  useStartServices: () => ({}),
}));

const wrapper = ({ children }: React.PropsWithChildren) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const makeProps = (): InputFieldProps => ({
  varDef: { name: 'data_stream.dataset', title: 'Dataset name', type: 'text' },
  value: { dataset: 'generic', package: 'kubernetes' },
  onChange: jest.fn(),
  packageName: 'kubernetes',
});

describe('PackagePolicyInputVarField dataset validation', () => {
  it('shows a custom dataset error after editing and clears it after correction', async () => {
    const props = makeProps();
    const { rerender } = render(<PackagePolicyInputVarField {...props} />, { wrapper });
    const input = screen.getByTestId('comboBoxSearchInput');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'kubernetes.Logs' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(props.onChange).toHaveBeenLastCalledWith({
      dataset: 'kubernetes.Logs',
      package: 'kubernetes',
    });
    rerender(
      <PackagePolicyInputVarField
        {...props}
        value={{ dataset: 'kubernetes.Logs', package: 'kubernetes' }}
        errors={['Dataset must be lowercase']}
      />
    );
    expect(screen.getByText('Dataset must be lowercase')).toBeVisible();
    expect(input).toHaveAttribute('aria-invalid', 'true');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'kubernetes.logs_valid' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });
    expect(props.onChange).toHaveBeenLastCalledWith({
      dataset: 'kubernetes.logs_valid',
      package: 'kubernetes',
    });
    rerender(
      <PackagePolicyInputVarField
        {...props}
        value={{ dataset: 'kubernetes.logs_valid', package: 'kubernetes' }}
        errors={[]}
      />
    );
    expect(screen.queryByText('Dataset must be lowercase')).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps errors hidden before the dataset is edited', () => {
    render(<PackagePolicyInputVarField {...makeProps()} errors={['Dataset must be lowercase']} />, {
      wrapper,
    });

    expect(screen.queryByText('Dataset must be lowercase')).not.toBeInTheDocument();
  });

  it('shows errors on an untouched dataset when forced', () => {
    render(
      <PackagePolicyInputVarField
        {...makeProps()}
        errors={['Dataset must be lowercase']}
        forceShowErrors
      />,
      { wrapper }
    );

    expect(screen.getByText('Dataset must be lowercase')).toBeVisible();
  });
});
