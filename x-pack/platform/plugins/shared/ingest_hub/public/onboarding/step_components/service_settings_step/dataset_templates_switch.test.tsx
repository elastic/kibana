/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('@kbn/fleet-plugin/public', () => {
  const MockField = ({
    varDef,
    value,
    onChange,
  }: {
    varDef: { name: string };
    value: string;
    onChange: (next: string) => void;
  }) => (
    <input
      data-test-subj={`mockField-${varDef.name}`}
      value={typeof value === 'string' ? value : ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return {
    LazyPackagePolicyInputVarField: MockField,
    DataStreamTypeSelector: () => null,
    NamespaceComboBox: () => null,
    useGetDataStreams: () => ({ data: undefined }),
  };
});

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { DuplicateServiceModal } from './duplicate_service_modal';
import { ServiceSettingsFlyout } from './service_settings_flyout';
import type { ServiceVars } from './use_service_settings';

const SWITCH = 'serviceSettingsFlyout-createDatasetTemplatesSwitch';
const DATASET_FIELD = 'mockField-data_stream.dataset';

const service = {
  id: 'ec2',
  name: 'Amazon EC2',
  signalTypes: ['metrics'],
  packageName: 'aws_cloudwatch_input_otel',
  dataStreams: ['ec2'],
  inputs: ['otelcol'],
  defaultEnabledInputs: ['otelcol'],
  requiredConfig: ['data_stream.dataset'],
  showInUI: true,
  deploymentMethods: [{ method: 'managed_integration', preferred: true }],
  varDefsByInput: {
    otelcol: {
      'data_stream.dataset': {
        name: 'data_stream.dataset',
        type: 'text',
        show_user: true,
        default: 'aws.ec2',
      },
    },
  },
  varDefsByDataStream: {
    ec2: {
      title: 'EC2',
      type: 'metrics',
      inputs: ['otelcol'],
      defaultEnabledInputs: ['otelcol'],
      requiredConfig: ['data_stream.dataset'],
      varDefsByInput: {
        otelcol: {
          'data_stream.dataset': {
            name: 'data_stream.dataset',
            type: 'text',
            show_user: true,
            default: 'aws.ec2',
          },
        },
      },
    },
  },
} as unknown as AwsServiceMatrixEntry;

const config: ServiceVars = { enabledDataStreams: ['ec2'], varsByDataStream: {} };

const setDataset = (dataset: string) =>
  fireEvent.change(screen.getByTestId(DATASET_FIELD), { target: { value: dataset } });

describe('ServiceSettingsFlyout — dedicated index template for a custom dataset', () => {
  const renderFlyout = (
    props: Partial<React.ComponentProps<typeof ServiceSettingsFlyout>> = {}
  ) => {
    const onApply = jest.fn();
    render(
      <I18nProvider>
        <ServiceSettingsFlyout
          service={service}
          config={config}
          globalRegion="us-east-1"
          onApply={onApply}
          onClose={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );
    return { onApply };
  };

  it('offers the switch once the dataset is customised, on by default', () => {
    renderFlyout();
    expect(screen.queryByTestId(SWITCH)).toBeNull();

    setDataset('aws.prod');

    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('saves the opt-out with the data stream', () => {
    const { onApply } = renderFlyout();
    setDataset('aws.prod');
    fireEvent.click(screen.getByTestId(SWITCH));

    fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));

    const [varsByDataStream] = onApply.mock.calls[0];
    expect(varsByDataStream.ec2.createDatasetTemplates).toBe(false);
    expect(varsByDataStream.ec2.varsByInput.otelcol['data_stream.dataset']).toBe('aws.prod');
  });

  it('shows a stored opt-out when reopened', () => {
    renderFlyout({
      config: {
        enabledDataStreams: ['ec2'],
        varsByDataStream: {
          ec2: {
            enabledInputs: ['otelcol'],
            varsByInput: { otelcol: { 'data_stream.dataset': 'aws.prod' } },
            createDatasetTemplates: false,
          },
        },
      },
    });

    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('hides the switch for a deployed service, where the flag is ignored on update', () => {
    renderFlyout({
      isDeployed: true,
      config: {
        enabledDataStreams: ['ec2'],
        varsByDataStream: {
          ec2: {
            enabledInputs: ['otelcol'],
            varsByInput: { otelcol: { 'data_stream.dataset': 'aws.prod' } },
          },
        },
      },
    });

    expect(screen.queryByTestId(SWITCH)).toBeNull();
  });
});

describe('DuplicateServiceModal — dedicated index template for a custom dataset', () => {
  it('starts from the source choice and adds the duplicate with the new one', () => {
    const onAdd = jest.fn();
    render(
      <I18nProvider>
        <DuplicateServiceModal
          service={service}
          sourceConfig={{
            enabledDataStreams: ['ec2'],
            varsByDataStream: {
              ec2: {
                enabledInputs: ['otelcol'],
                varsByInput: { otelcol: { 'data_stream.dataset': 'aws.prod' } },
                createDatasetTemplates: false,
              },
            },
          }}
          suggestedName="Amazon EC2 [Duplicate]"
          existingNames={['Amazon EC2']}
          globalRegion="us-east-1"
          onAdd={onAdd}
          onCancel={jest.fn()}
        />
      </I18nProvider>
    );

    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
    fireEvent.click(screen.getByTestId(SWITCH));
    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));

    const [, varsByDataStream] = onAdd.mock.calls[0];
    expect(varsByDataStream.ec2.createDatasetTemplates).toBe(true);
  });
});
