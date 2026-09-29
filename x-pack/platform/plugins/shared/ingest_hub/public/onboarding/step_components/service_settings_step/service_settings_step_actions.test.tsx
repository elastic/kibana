/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { RegistryVarsEntry } from '@kbn/fleet-plugin/common';
import { I18nProvider } from '@kbn/i18n-react';

vi.mock('../../onboarding_flow_context', () => {
  const mocked = { useOnboardingFlow: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('./use_service_settings', () => {
  const mocked = { useServiceSettings: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('./service_settings_flyout', () => {
  const mocked = { ServiceSettingsFlyout: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./duplicate_service_modal', () => {
  const mocked = {
    DuplicateServiceModal: () => <div data-test-subj="duplicate-modal" />,
  };
  return { ...mocked, default: mocked };
});
vi.mock('../service_search_filter', () => {
  const mocked = { ServiceSearchFilter: () => null };
  return { ...mocked, default: mocked };
});
vi.mock('./duplicate_name', () => {
  const mocked = { buildDuplicateName: () => 'Copy' };
  return { ...mocked, default: mocked };
});
vi.mock('@kbn/ui-callout', () => {
  const mocked = { KbnWarningCallout: () => null };
  return { ...mocked, default: mocked };
});

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
  (useOnboardingFlow as Mock).mockReturnValue({
    awsServicesMap: servicesMap,
    detectAndReviewStep: { policyIdsByInstance: {}, serviceStatuses: {} },
  });
  (useServiceSettings as Mock).mockReturnValue({
    globalRegion: 'us-east-1',
    setGlobalRegion: vi.fn(),
    instances,
    filteredInstances: instances,
    incompleteInstances: [],
    incompleteInstanceIds: new Set(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    signalFilter: 'all',
    setSignalFilter: vi.fn(),
    getServiceVars: vi.fn().mockReturnValue({ enabledDataStreams: [], varsByDataStream: {} }),
    setServiceFieldsAndInputs: vi.fn(),
    addDuplicate: vi.fn(),
    removeInstance: vi.fn(),
    allInstanceNames: instances.map((i) => i.name),
    globalRegionTouched: false,
    setGlobalRegionTouched: vi.fn(),
    isReady: true,
    handleNext: vi.fn(),
  });
  render(
    <I18nProvider>
      <ServiceSettingsStep onContinue={vi.fn()} />
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

describe('ServiceSettingsStep — global region lock', () => {
  function renderWithDeployState(detectAndReviewStep: {
    policyIdsByInstance?: Record<string, string>;
    serviceStatuses?: Record<string, string>;
  }) {
    (useOnboardingFlow as Mock).mockReturnValue({
      awsServicesMap: new Map(),
      detectAndReviewStep: {
        policyIdsByInstance: detectAndReviewStep.policyIdsByInstance ?? {},
        serviceStatuses: detectAndReviewStep.serviceStatuses ?? {},
      },
    });
    (useServiceSettings as Mock).mockReturnValue({
      globalRegion: 'us-east-1',
      setGlobalRegion: vi.fn(),
      instances: [],
      filteredInstances: [],
      incompleteInstances: [],
      incompleteInstanceIds: new Set(),
      searchQuery: '',
      setSearchQuery: vi.fn(),
      signalFilter: 'all',
      setSignalFilter: vi.fn(),
      getServiceVars: vi.fn().mockReturnValue({ enabledDataStreams: [], varsByDataStream: {} }),
      setServiceFieldsAndInputs: vi.fn(),
      addDuplicate: vi.fn(),
      removeInstance: vi.fn(),
      allInstanceNames: [],
      globalRegionTouched: false,
      setGlobalRegionTouched: vi.fn(),
      isReady: true,
      handleNext: vi.fn(),
    });
    render(
      <I18nProvider>
        <ServiceSettingsStep onContinue={vi.fn()} />
      </I18nProvider>
    );
  }

  it('disables the region combo box when policyIdsByInstance is non-empty', () => {
    renderWithDeployState({ policyIdsByInstance: { cloudtrail: 'policy-id-1' } });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('disables the region combo box when a service status is in-progress', () => {
    renderWithDeployState({ serviceStatuses: { cloudtrail: 'receiving' } });
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('leaves the region combo box enabled when all statuses are error or timeout and policyIdsByInstance is empty', () => {
    renderWithDeployState({
      policyIdsByInstance: {},
      serviceStatuses: { cloudtrail: 'error', waf: 'timeout' },
    });
    expect(screen.getByRole('combobox')).not.toBeDisabled();
  });
});
