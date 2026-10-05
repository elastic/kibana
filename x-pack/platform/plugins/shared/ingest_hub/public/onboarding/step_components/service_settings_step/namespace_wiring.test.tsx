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
