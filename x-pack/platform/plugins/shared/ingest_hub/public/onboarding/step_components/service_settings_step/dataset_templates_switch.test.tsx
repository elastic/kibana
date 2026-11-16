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

describe('ServiceSettingsFlyout — dedicated index template switch', () => {
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
  const save = () => fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));

  it('offers the switch on from the start, at the manifest default dataset', () => {
    renderFlyout();

    expect(screen.getByTestId(SWITCH)).toBeChecked();
  });

  it('keeps offering it for a custom dataset and hides it for the generic one', () => {
    renderFlyout();

    setDataset('aws.prod');
    expect(screen.getByTestId(SWITCH)).toBeChecked();

    setDataset('generic');
    expect(screen.queryByTestId(SWITCH)).toBeNull();
  });

  it('reports a change on save, for the policy to take', () => {
    const { onApply } = renderFlyout();
    fireEvent.click(screen.getByTestId(SWITCH));

    save();

    expect(onApply.mock.calls[0][3]).toBe(false);
  });

  it('reports nothing when the choice was not touched, so a save leaves the policy alone', () => {
    const { onApply } = renderFlyout();
    setDataset('aws.prod');

    save();

    expect(onApply.mock.calls[0][3]).toBeUndefined();
  });

  it('shows the value of the policy and which other services it applies to', () => {
    renderFlyout({
      datasetTemplatesPolicy: {
        enabled: false,
        instanceIds: ['ec2', 'lambda'],
        sharedWith: ['Amazon Lambda'],
      },
    });

    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
    expect(
      screen.getByTestId('serviceSettingsFlyout-createDatasetTemplatesShared')
    ).toHaveTextContent('Amazon Lambda');
  });

  it('can be turned back on over a policy that is off', () => {
    const { onApply } = renderFlyout({
      datasetTemplatesPolicy: { enabled: false, instanceIds: ['ec2'], sharedWith: [] },
    });
    fireEvent.click(screen.getByTestId(SWITCH));

    save();

    expect(onApply.mock.calls[0][3]).toBe(true);
  });

  it('falls back to the choice stored on the service when no policy is given', () => {
    renderFlyout({ config: { ...config, createDatasetTemplates: false } });

    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
  });

  it('hides the switch for a deployed service, where the flag is ignored on update', () => {
    renderFlyout({ isDeployed: true });

    expect(screen.queryByTestId(SWITCH)).toBeNull();
  });
});

describe('DuplicateServiceModal — dedicated index template switch', () => {
  const renderModal = (createDatasetTemplates?: boolean) => {
    const onAdd = jest.fn();
    render(
      <I18nProvider>
        <DuplicateServiceModal
          service={service}
          sourceConfig={{
            enabledDataStreams: ['ec2'],
            varsByDataStream: {},
            ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
          }}
          suggestedName="Amazon EC2 [Duplicate]"
          existingNames={['Amazon EC2']}
          globalRegion="us-east-1"
          onAdd={onAdd}
          onCancel={jest.fn()}
        />
      </I18nProvider>
    );
    return { onAdd };
  };

  it('starts from the choice of the source and adds the duplicate with its own', () => {
    const { onAdd } = renderModal(false);

    expect(screen.getByTestId(SWITCH)).not.toBeChecked();
    fireEvent.click(screen.getByTestId(SWITCH));
    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));

    expect(onAdd.mock.calls[0][4]).toBe(true);
  });

  it('is on for the duplicate of a service that never chose', () => {
    const { onAdd } = renderModal();

    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));

    expect(onAdd.mock.calls[0][4]).toBe(true);
  });
});
