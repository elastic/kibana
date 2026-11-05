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
    placeholder,
    onNamespaceChange,
    'data-test-subj': dataTestSubj,
  }: {
    namespace?: string;
    placeholder?: string;
    onNamespaceChange: (ns: string) => void;
    'data-test-subj'?: string;
  }) => (
    <input
      data-test-subj={dataTestSubj}
      value={namespace ?? ''}
      placeholder={placeholder}
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
          isDuplicate
          onApply={onApply}
          onClose={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );
    return { onApply };
  }

  it('saves the namespace a duplicate edited', () => {
    const { onApply } = renderFlyout();
    typeNamespace('staging');
    fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));
    expect(onApply).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'staging');
  });

  it('shows the global namespace as the placeholder of a duplicate without its own', () => {
    renderFlyout({ config: { ...CONFIG, namespace: '' }, globalNamespace: 'global' });
    expect(screen.getByTestId('serviceSettings-namespaceField')).toHaveValue('');
    expect(screen.getByTestId('serviceSettings-namespaceField')).toHaveAttribute(
      'placeholder',
      'global'
    );
  });

  it('keeps following the global namespace when other settings are saved', () => {
    const { onApply } = renderFlyout({
      config: { ...CONFIG, namespace: '' },
      globalNamespace: 'global',
    });
    fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));
    expect(onApply).toHaveBeenCalledWith(expect.anything(), expect.anything(), '');
  });

  it('shows the default placeholder when there is no global namespace', () => {
    renderFlyout({ config: { ...CONFIG, namespace: '' }, globalNamespace: '' });
    expect(screen.getByTestId('serviceSettings-namespaceField')).toHaveAttribute(
      'placeholder',
      'default'
    );
  });

  it('disables Save while the duplicate namespace is invalid', () => {
    renderFlyout();
    typeNamespace('Staging');
    expect(screen.getByTestId('serviceSettingsFlyout-saveButton')).toBeDisabled();
  });

  it('keeps the namespace editable once the duplicate is deployed, with a note', () => {
    renderFlyout({ isDeployed: true });
    expect(screen.getByTestId('serviceSettings-namespaceField')).toBeEnabled();
    expect(screen.getByTestId('serviceSettings-namespaceField-note')).toBeInTheDocument();
  });

  it('has no namespace field for an original, which takes the global namespace', () => {
    const { onApply } = renderFlyout({ isDuplicate: false });
    expect(screen.queryByTestId('serviceSettings-namespaceField')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('serviceSettingsFlyout-saveButton'));
    expect(onApply).toHaveBeenCalledWith(expect.anything(), expect.anything(), undefined);
  });

  it('hides the namespace for ECF-only services', () => {
    renderFlyout({ service: ECF_ONLY });
    expect(screen.queryByTestId('serviceSettings-namespaceField')).not.toBeInTheDocument();
  });
});

describe('DuplicateServiceModal namespace', () => {
  function renderModal(props: Partial<React.ComponentProps<typeof DuplicateServiceModal>> = {}) {
    const onAdd = jest.fn();
    render(
      <I18nProvider>
        <DuplicateServiceModal
          service={AGENTLESS}
          sourceConfig={CONFIG}
          suggestedName="Service [Duplicate]"
          existingNames={['Service']}
          globalRegion="us-east-1"
          globalNamespace="global"
          onAdd={onAdd}
          onCancel={jest.fn()}
          {...props}
        />
      </I18nProvider>
    );
    return { onAdd };
  }

  it('starts from the global namespace, not the source one', () => {
    renderModal();
    expect(screen.getByTestId('serviceSettings-namespaceField')).toHaveValue('global');
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

  it('adds the duplicate with the global namespace when it was not changed', () => {
    const { onAdd } = renderModal();
    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));
    expect(onAdd).toHaveBeenCalledWith(
      'Service [Duplicate]',
      expect.anything(),
      expect.anything(),
      'global'
    );
  });

  it('updates the suggested name with the namespace until the user types a name', () => {
    const { onAdd } = renderModal({ suggestName: (ns) => `aws-1-${ns} [Duplicate]` });
    typeNamespace('qa');
    expect(screen.getByTestId('duplicateServiceModal-nameField')).toHaveValue(
      'aws-1-qa [Duplicate]'
    );

    fireEvent.change(screen.getByTestId('duplicateServiceModal-nameField'), {
      target: { value: 'my copy' },
    });
    typeNamespace('prod');
    expect(screen.getByTestId('duplicateServiceModal-nameField')).toHaveValue('my copy');

    fireEvent.click(screen.getByTestId('duplicateServiceModal-addButton'));
    expect(onAdd).toHaveBeenCalledWith('my copy', expect.anything(), expect.anything(), 'prod');
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
