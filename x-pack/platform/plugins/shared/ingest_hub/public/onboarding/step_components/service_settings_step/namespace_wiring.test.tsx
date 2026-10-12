/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('./service_fields_form', () => ({ ServiceFieldsForm: () => null }));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { docLinks: undefined } }),
}));
jest.mock('@kbn/fleet-plugin/public', () => ({
  NamespaceComboBox: ({
    namespace,
    onNamespaceChange,
    'data-test-subj': dataTestSubj,
  }: {
    namespace?: string;
    onNamespaceChange: (ns: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={dataTestSubj}
      value={namespace ?? ''}
      onChange={(e) => onNamespaceChange(e.target.value)}
    />
  ),
}));

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from './use_service_settings';
import { ServiceSettingsFlyout } from './service_settings_flyout';
import { DuplicateServiceModal } from './duplicate_service_modal';

function makeService(deploymentMethods: AwsServiceMatrixEntry['deploymentMethods']) {
  return {
    id: 'svc',
    name: 'Service',
    category: 'compute',
    signalTypes: ['logs'],
    dataStreams: ['svc'],
    packageName: 'aws',
    deploymentMethods,
    inputs: [],
    defaultEnabled: true,
    defaultEnabledInputs: [],
    showInUI: true,
    isManifestLoaded: true,
    isManifestError: false,
    isStaticAgentBasedOnly: false,
  } as AwsServiceMatrixEntry;
}

const AGENTLESS = makeService([{ method: 'managed_integration', preferred: true }]);
const ECF_ONLY = makeService([{ method: 'ecf' }]);
const CONFIG: ServiceVars = {
  enabledDataStreams: ['svc'],
  varsByDataStream: {},
  namespace: 'prod',
};

const typeNamespace = (value: string) =>
  fireEvent.change(screen.getByTestId('serviceSettings-namespaceField'), { target: { value } });

describe('ServiceSettingsFlyout namespace', () => {
  function renderFlyout(props: Partial<React.ComponentProps<typeof ServiceSettingsFlyout>> = {}) {
    const onApply = jest.fn();
    render(
      <I18nProvider>
        <ServiceSettingsFlyout
          service={AGENTLESS}
          config={CONFIG}
          globalRegion="us-east-1"
          onApply={onApply}
          onClose={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );
    return { onApply };
  }

  it('saves the edited namespace', () => {
    const { onApply } = renderFlyout();
    typeNamespace('staging');
    fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));
    expect(onApply).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'staging');
  });

  it('disables Save while the namespace is invalid', () => {
    renderFlyout();
    typeNamespace('Staging');
    expect(screen.getByTestId('serviceSettingsFlyout-saveButton')).toBeDisabled();
  });

  it('shows the namespace read-only once the instance is deployed', () => {
    renderFlyout({ isNamespaceLocked: true });
    expect(screen.getByTestId('serviceSettings-namespaceField-locked')).toHaveValue('prod');
  });

  it('hides the namespace for ECF-only services', () => {
    renderFlyout({ service: ECF_ONLY });
    expect(screen.queryByTestId('serviceSettings-namespaceField')).not.toBeInTheDocument();
  });
});

describe('DuplicateServiceModal namespace', () => {
  function renderModal() {
    const onAdd = jest.fn();
    render(
      <I18nProvider>
        <DuplicateServiceModal
          service={AGENTLESS}
          sourceConfig={CONFIG}
          suggestedName="Service [Duplicate]"
          existingNames={['Service']}
          globalRegion="us-east-1"
          onAdd={onAdd}
          onCancel={jest.fn()}
        />
      </I18nProvider>
    );
    return { onAdd };
  }

  it('starts from the source namespace', () => {
    renderModal();
    expect(screen.getByTestId('serviceSettings-namespaceField')).toHaveValue('prod');
  });

  it('adds the duplicate with the namespace the user entered', () => {
    const { onAdd } = renderModal();
    typeNamespace('staging');
    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));
    expect(onAdd).toHaveBeenCalledWith(
      'Service [Duplicate]',
      expect.anything(),
      expect.anything(),
      'staging'
    );
  });

  it('disables Add while the namespace is invalid', () => {
    renderModal();
    typeNamespace('prod-eu');
    expect(screen.getByTestId('duplicateServiceModal-addButton')).toBeDisabled();
  });
});

describe('ServiceSettingsFlyout Save gating', () => {
  const optional = (name: string) => ({
    name,
    type: 'text' as const,
    title: name,
    required: false,
    show_user: true,
  });
  const varDefsByInput = {
    'aws-s3': { bucket_arn: optional('bucket_arn'), queue_url: optional('queue_url') },
  };
  const S3_SERVICE = {
    ...makeService([{ method: 'ecf', preferred: true }]),
    dataStreams: ['waf'],
    inputs: ['aws-s3'],
    optionalConfig: ['bucket_arn', 'queue_url'],
    defaultEnabledInputs: ['aws-s3'],
    ecfSettings: {
      requiredConfig: ['bucket_arn'],
      dataStreams: ['waf'],
      inputs: ['aws-s3'],
      defaultEnabledInputs: ['aws-s3'],
    },
    varDefsByInput,
    varDefsByDataStream: {
      waf: { inputs: ['aws-s3'], defaultEnabledInputs: ['aws-s3'], varDefsByInput },
    },
  } as unknown as AwsServiceMatrixEntry;
  const configWith = (vars: Record<string, string>): ServiceVars => ({
    enabledDataStreams: ['waf'],
    varsByDataStream: { waf: { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': vars } } },
    namespace: 'prod',
  });
  const renderSave = (service: AwsServiceMatrixEntry, config: ServiceVars) => {
    render(
      <I18nProvider>
        <ServiceSettingsFlyout
          service={service}
          config={config}
          globalRegion="us-east-1"
          onApply={jest.fn()}
          onClose={jest.fn()}
        />
      </I18nProvider>
    );
    return screen.getByTestId('serviceSettingsFlyout-saveButton');
  };

  it('disables Save while no S3 source is set under agent-based', () => {
    expect(renderSave(S3_SERVICE, configWith({ bucket_arn: '' }))).toBeDisabled();
  });

  it('enables Save once a source is set', () => {
    expect(renderSave(S3_SERVICE, configWith({ queue_url: 'https://q' }))).toBeEnabled();
  });

  const ECF_VIEW = {
    ...S3_SERVICE,
    settingsScope: 'ecf' as const,
    requiredConfig: ['bucket_arn'],
  };

  it('disables Save for an empty required ARN in the ECF view', () => {
    expect(renderSave(ECF_VIEW, configWith({ bucket_arn: '' }))).toBeDisabled();
  });

  it('enables Save for a filled ARN in the ECF view', () => {
    expect(renderSave(ECF_VIEW, configWith({ bucket_arn: 'arn:aws:s3:::b' }))).toBeEnabled();
  });
});
