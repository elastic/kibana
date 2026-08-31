/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('./use_service_settings', () => ({ useServiceSettings: jest.fn() }));
jest.mock('./service_settings_flyout', () => ({ ServiceSettingsFlyout: () => null }));
jest.mock('./duplicate_service_modal', () => ({
  DuplicateServiceModal: () => <div data-test-subj="duplicate-modal" />,
}));
jest.mock('../service_search_filter', () => ({ ServiceSearchFilter: () => null }));
jest.mock('./duplicate_name', () => ({ buildDuplicateName: () => 'Copy' }));
jest.mock('@kbn/ui-callout', () => ({ KbnWarningCallout: () => null }));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServiceSettings } from './use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance } from './use_service_settings';
import { ServiceSettingsStep } from '.';

function makeService(
  id: string,
  deploymentMethods: AwsServiceMatrixEntry['deploymentMethods']
): AwsServiceMatrixEntry {
  return {
    id,
    name: `Service ${id}`,
    category: 'security_identity_compliance',
    signalTypes: ['logs'],
    dataStreams: [],
    packageName: 'aws',
    deploymentMethods,
    inputs: [],
    defaultEnabled: true,
    defaultEnabledInputs: [],
    showInUI: true,
  };
}

function makeVarDef(name: string): RegistryVarsEntry {
  return { name, type: 'text', title: name, required: true, show_user: true } as RegistryVarsEntry;
}

const ECF_SVC = makeService('ecf_svc', [{ method: 'ecf' }]);
const AGENTLESS_SVC = makeService('agentless_svc', [
  { method: 'managed_integration', preferred: true },
]);
const BOTH_SVC = makeService('both_svc', [
  { method: 'managed_integration', preferred: true },
  { method: 'ecf' },
]);
const ECF_CONFIGURABLE_SVC: AwsServiceMatrixEntry = {
  ...makeService('ecf_configurable_svc', [{ method: 'ecf' }]),
  dataStreams: ['cloudtrail'],
  inputs: ['aws-s3', 'aws-cloudwatch'],
  requiredConfig: ['bucket_arn', 'log_group_arn'],
  varDefsByInput: {
    'aws-s3': { bucket_arn: makeVarDef('bucket_arn') },
    'aws-cloudwatch': { log_group_arn: makeVarDef('log_group_arn') },
  },
};

function makeInstance(
  instanceId: string,
  serviceId: string,
  name: string,
  isDuplicate: boolean
): ServiceInstance {
  return { instanceId, serviceId, name, isDuplicate };
}

function renderStep(instances: ServiceInstance[], servicesMap: Map<string, AwsServiceMatrixEntry>) {
  (useOnboardingFlow as jest.Mock).mockReturnValue({
    awsServicesMap: servicesMap,
  });
  (useServiceSettings as jest.Mock).mockReturnValue({
    globalRegion: 'us-east-1',
    setGlobalRegion: jest.fn(),
    instances,
    filteredInstances: instances,
    incompleteInstances: [],
    incompleteInstanceIds: new Set(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    signalFilter: 'all',
    setSignalFilter: jest.fn(),
    getServiceVars: jest.fn().mockReturnValue({ enabledDataStreams: [], varsByDataStream: {} }),
    setServiceFieldsAndInputs: jest.fn(),
    addDuplicate: jest.fn(),
    removeInstance: jest.fn(),
    allInstanceNames: instances.map((i) => i.name),
    globalRegionTouched: false,
    setGlobalRegionTouched: jest.fn(),
    isReady: true,
    handleNext: jest.fn(),
  });
  render(
    <I18nProvider>
      <ServiceSettingsStep onContinue={jest.fn()} />
    </I18nProvider>
  );
}

describe('ServiceSettingsStep — actions column', () => {
  it('renders no ⋮ button for an ECF-only non-duplicate instance', () => {
    const inst = makeInstance('ecf_svc', 'ecf_svc', 'ECF Service', false);
    renderStep([inst], new Map([['ecf_svc', ECF_SVC]]));
    expect(
      screen.queryByTestId('serviceSettingsStep-actionsButton-ecf_svc')
    ).not.toBeInTheDocument();
  });

  it('shows Duplicate in ⋮ menu for an agentless service and opens the modal on click', () => {
    const inst = makeInstance('agentless_svc', 'agentless_svc', 'Agentless Service', false);
    renderStep([inst], new Map([['agentless_svc', AGENTLESS_SVC]]));

    fireEvent.click(screen.getByTestId('serviceSettingsStep-actionsButton-agentless_svc'));
    expect(
      screen.getByTestId('serviceSettingsStep-duplicateAction-agentless_svc')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('serviceSettingsStep-duplicateAction-agentless_svc'));
    expect(screen.getByTestId('duplicate-modal')).toBeInTheDocument();
  });

  it('shows Duplicate in ⋮ menu for a service with both managed_integration and ecf methods', () => {
    const inst = makeInstance('both_svc', 'both_svc', 'Both Methods Service', false);
    renderStep([inst], new Map([['both_svc', BOTH_SVC]]));

    fireEvent.click(screen.getByTestId('serviceSettingsStep-actionsButton-both_svc'));
    expect(screen.getByTestId('serviceSettingsStep-duplicateAction-both_svc')).toBeInTheDocument();
  });

  it('shows only Remove in ⋮ menu for a pre-existing ECF duplicate', () => {
    const inst = makeInstance('ecf_dup', 'ecf_svc', 'ECF Duplicate', true);
    renderStep([inst], new Map([['ecf_svc', ECF_SVC]]));

    fireEvent.click(screen.getByTestId('serviceSettingsStep-actionsButton-ecf_dup'));
    expect(
      screen.queryByTestId('serviceSettingsStep-duplicateAction-ecf_dup')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('serviceSettingsStep-removeAction-ecf_dup')).toBeInTheDocument();
  });

  it('keeps ECF-only configurable services editable while hiding the ⋮ duplicate action', () => {
    const inst = makeInstance(
      'ecf_configurable_svc',
      'ecf_configurable_svc',
      'ECF Configurable Service',
      false
    );
    renderStep([inst], new Map([['ecf_configurable_svc', ECF_CONFIGURABLE_SVC]]));

    expect(screen.getByTestId('serviceSettingsStep-editButton-ecf_configurable_svc')).toBeVisible();
    expect(
      screen.queryByTestId('serviceSettingsStep-actionsButton-ecf_configurable_svc')
    ).not.toBeInTheDocument();
  });
});
