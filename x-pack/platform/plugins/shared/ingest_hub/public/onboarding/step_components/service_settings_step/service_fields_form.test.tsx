/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/fleet-plugin/public', () => ({
  LazyPackagePolicyInputVarField: jest.fn(() => null),
}));

import { ServiceFieldsForm } from './service_fields_form';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

function renderForm(
  service: AwsServiceMatrixEntry,
  props: Partial<React.ComponentProps<typeof ServiceFieldsForm>> = {}
) {
  const onFieldChange = jest.fn();
  const onInputToggle = jest.fn();
  const result = render(
    <I18nProvider>
      <ServiceFieldsForm
        service={service}
        varsByDataStream={{}}
        globalRegion="us-east-1"
        onFieldChange={onFieldChange}
        onInputToggle={onInputToggle}
        {...props}
      />
    </I18nProvider>
  );
  return { ...result, onFieldChange, onInputToggle };
}

// ─── Multi-DS flat input-toggle rendering ────────────────────────────────────

describe('ServiceFieldsForm — multi-DS flat input-toggle rendering', () => {
  // Two data streams:
  //   ds_a: one input (aws-s3), defaultEnabled
  //   ds_b: two inputs (aws-s3, aws-cloudwatch), only aws-s3 defaultEnabled
  const MULTI_DS_SERVICE: AwsServiceMatrixEntry = {
    id: 'test_multi',
    name: 'Test Multi DS',
    category: 'security_identity_compliance',
    signalTypes: ['logs'],
    dataStreams: ['ds_a', 'ds_b'],
    packageName: 'aws',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws-s3', 'aws-cloudwatch'],
    defaultEnabled: true,
    defaultEnabledInputs: ['aws-s3'],
    showInUI: true,
    varDefsByDataStream: {
      ds_a: {
        title: 'DS A Logs',
        type: 'logs',
        inputs: ['aws-s3'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: {},
      },
      ds_b: {
        title: 'DS B Logs',
        type: 'logs',
        inputs: ['aws-s3', 'aws-cloudwatch'],
        defaultEnabledInputs: ['aws-s3'],
        varDefsByInput: {},
      },
    },
  };

  it('renders one switch per (dsId, input) combination in flat order', () => {
    renderForm(MULTI_DS_SERVICE);
    // ds_a has 1 input, ds_b has 2 → 3 switches total
    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
  });

  it('uses data-test-subj serviceSettingsFlyout-inputToggle-{dsId}-{input}', () => {
    const { getByTestId } = renderForm(MULTI_DS_SERVICE);
    expect(getByTestId('serviceSettingsFlyout-inputToggle-ds_a-aws-s3')).toBeInTheDocument();
    expect(getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-s3')).toBeInTheDocument();
    expect(
      getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-cloudwatch')
    ).toBeInTheDocument();
  });

  it('uses DS title as label when DS has only one input', () => {
    renderForm(MULTI_DS_SERVICE);
    // ds_a has 1 input → label span shows only the DS title
    expect(screen.getByText('DS A Logs')).toBeInTheDocument();
  });

  it('uses "DS title — input label" when DS has multiple inputs', () => {
    renderForm(MULTI_DS_SERVICE);
    // ds_b has 2 inputs → label spans show "DS B Logs — <transport>"
    expect(screen.getByText('DS B Logs — Collect logs via S3')).toBeInTheDocument();
    expect(screen.getByText('DS B Logs — Collect logs via CloudWatch')).toBeInTheDocument();
  });

  it('checks inputs listed in defaultEnabledInputs and unchecks the rest', () => {
    renderForm(MULTI_DS_SERVICE);
    const s3SwitchA = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_a-aws-s3');
    const s3SwitchB = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-s3');
    const cwSwitchB = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-cloudwatch');
    expect(s3SwitchA).toBeChecked();
    expect(s3SwitchB).toBeChecked();
    expect(cwSwitchB).not.toBeChecked();
  });

  it('calls onInputToggle with (dsId, input, boolean) when a switch is toggled', () => {
    const { onInputToggle } = renderForm(MULTI_DS_SERVICE);
    const cwSwitch = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-cloudwatch');
    fireEvent.click(cwSwitch);
    expect(onInputToggle).toHaveBeenCalledWith('ds_b', 'aws-cloudwatch', true);
  });

  it('honours stored enabledInputs from varsByDataStream over defaults', () => {
    renderForm(MULTI_DS_SERVICE, {
      varsByDataStream: {
        ds_b: { enabledInputs: ['aws-cloudwatch'], varsByInput: {} },
      },
    });
    const s3SwitchB = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-s3');
    const cwSwitchB = screen.getByTestId('serviceSettingsFlyout-inputToggle-ds_b-aws-cloudwatch');
    expect(s3SwitchB).not.toBeChecked();
    expect(cwSwitchB).toBeChecked();
  });
});
