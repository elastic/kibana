/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

jest.mock('../../onboarding_flow_context', () => ({ useOnboardingFlow: jest.fn() }));
jest.mock('./use_service_settings', () => ({ useServiceSettings: jest.fn() }));
jest.mock('./service_settings_flyout', () => ({
  ServiceSettingsFlyout: ({
    datasetTemplatesPolicy,
    onApply,
  }: {
    datasetTemplatesPolicy?: unknown;
    onApply: (...args: unknown[]) => void;
  }) => (
    <div>
      <div data-test-subj="mockFlyout">{JSON.stringify(datasetTemplatesPolicy ?? null)}</div>
      <button data-test-subj="mockApplyUntouched" onClick={() => onApply({}, [], undefined)} />
      <button
        data-test-subj="mockApplyOff"
        onClick={() =>
          // The dataset is left at its default, as when only the switch is turned off.
          onApply(
            { ec2: { enabledInputs: ['otelcol'], varsByInput: {} } },
            ['ec2'],
            undefined,
            false
          )
        }
      />
      <button
        data-test-subj="mockApplyCustomOff"
        onClick={() =>
          onApply(
            {
              ec2: {
                enabledInputs: ['otelcol'],
                varsByInput: { otelcol: { 'data_stream.dataset': 'aws.prod' } },
              },
            },
            ['ec2'],
            undefined,
            false
          )
        }
      />
    </div>
  ),
}));
jest.mock('./duplicate_service_modal', () => ({ DuplicateServiceModal: () => null }));
jest.mock('../service_search_filter', () => ({ ServiceSearchFilter: () => null }));
jest.mock('@kbn/ui-callout', () => ({ KbnWarningCallout: () => null }));
jest.mock('./output_field', () => ({ OutputField: () => null }));
jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({
    services: {
      docLinks: { links: { fleet: { datastreams: 'https://example.com/datastreams' } } },
    },
  }),
}));

import { useOnboardingFlow } from '../../onboarding_flow_context';
import { useServiceSettings } from './use_service_settings';
import type { ServiceInstance, ServiceVars } from './use_service_settings';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { ServiceSettingsStep } from '.';

const datasetVar = { name: 'data_stream.dataset', type: 'text', show_user: true, default: 'x' };

const makeOtel = (id: string, packageName = 'aws_cloudwatch_input_otel') =>
  ({
    id,
    name: id,
    signalTypes: ['metrics'],
    packageName,
    dataStreams: [id],
    inputs: ['otelcol'],
    defaultEnabled: true,
    defaultEnabledInputs: ['otelcol'],
    requiredConfig: ['data_stream.dataset'],
    showInUI: true,
    isManifestLoaded: true,
    isManifestError: false,
    isStaticAgentBasedOnly: false,
    deploymentMethods: [
      { method: 'managed_integration', preferred: true },
      { method: 'agent_based' },
    ],
    varDefsByInput: { otelcol: { 'data_stream.dataset': datasetVar } },
    varDefsByDataStream: {
      [id]: {
        inputs: ['otelcol'],
        defaultEnabledInputs: ['otelcol'],
        varDefsByInput: { otelcol: { 'data_stream.dataset': { ...datasetVar, default: id } } },
      },
    },
  } as unknown as AwsServiceMatrixEntry);

const instance = (instanceId: string, isDuplicate = false): ServiceInstance => ({
  instanceId,
  serviceId: instanceId.split('__')[0],
  name: `Name ${instanceId}`,
  isDuplicate,
});

const varsFor = (id: string, dataset: string, createDatasetTemplates?: boolean): ServiceVars => ({
  enabledDataStreams: [id],
  varsByDataStream: {
    [id]: {
      enabledInputs: ['otelcol'],
      varsByInput: { otelcol: { 'data_stream.dataset': dataset } },
    },
  },
  ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
});

const renderStep = ({
  instances,
  services,
  stored,
  deploymentMethod = 'managed_integration',
  namespace = '',
}: {
  instances: ServiceInstance[];
  services: AwsServiceMatrixEntry[];
  stored: Record<string, ServiceVars>;
  deploymentMethod?: 'managed_integration' | 'agent_based';
  namespace?: string;
}) => {
  (useOnboardingFlow as jest.Mock).mockReturnValue({
    agentBasedDeployment: { agentHostsMode: 'existing' },
    awsServicesMap: new Map(services.map((s) => [s.id, s])),
    detectAndReviewStep: { policyIdsByInstance: {}, serviceStatuses: {} },
    servicesStep: { selectedServiceIds: services.map((s) => s.id) },
    deploymentMethod,
    refetchAwsServiceMatrix: jest.fn(),
  });
  const setServiceFieldsAndInputs = jest.fn();
  (useServiceSettings as jest.Mock).mockReturnValue({
    globalRegion: 'us-east-1',
    integrationName: 'my-aws',
    setIntegrationName: jest.fn(),
    description: '',
    setDescription: jest.fn(),
    hasPolicyServices: true,
    setGlobalRegion: jest.fn(),
    instances,
    filteredInstances: instances,
    incompleteInstances: [],
    incompleteInstanceIds: new Set(),
    searchQuery: '',
    setSearchQuery: jest.fn(),
    signalFilter: 'all',
    setSignalFilter: jest.fn(),
    getServiceVars: (id: string) =>
      stored[id] ?? { enabledDataStreams: [id.split('__')[0]], varsByDataStream: {} },
    setServiceFieldsAndInputs,
    addDuplicate: jest.fn(),
    removeInstance: jest.fn(),
    allInstanceNames: instances.map((i) => i.name),
    namespace,
    setNamespace: jest.fn(),
    policySettings: {},
    setPolicySetting: jest.fn(),
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
  return { setServiceFieldsAndInputs };
};

const openFlyout = (instanceId: string) =>
  fireEvent.click(screen.getByTestId(`serviceSettingsStep-serviceLink-${instanceId}`));

const shownPolicy = () => JSON.parse(screen.getByTestId('mockFlyout').textContent ?? 'null');

describe('ServiceSettingsStep — services that share a dataset template policy', () => {
  const ec2 = makeOtel('ec2');
  const lambda = makeOtel('lambda');
  const twoServices = {
    instances: [instance('ec2'), instance('lambda')],
    services: [ec2, lambda],
  };

  it('gives the flyout the value of the policy and the services a change reaches', () => {
    renderStep({
      ...twoServices,
      stored: { ec2: varsFor('ec2', 'aws.prod', false), lambda: varsFor('lambda', 'lambda') },
    });

    openFlyout('ec2');

    expect(shownPolicy()).toStrictEqual({
      enabled: true,
      instanceIds: ['ec2', 'lambda'],
      sharedWith: ['Name lambda'],
    });
  });

  it('is off when every service in the policy turned it off', () => {
    renderStep({
      ...twoServices,
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: varsFor('lambda', 'lambda', false),
      },
    });

    openFlyout('ec2');

    expect(shownPolicy().enabled).toBe(false);
  });

  it('does not pull in a service of another package, which deploys in a policy of its own', () => {
    renderStep({
      instances: twoServices.instances,
      services: [ec2, makeOtel('lambda', 'aws_other_input_otel')],
      stored: { ec2: varsFor('ec2', 'aws.prod', false) },
    });

    openFlyout('ec2');

    expect(shownPolicy()).toStrictEqual({ enabled: false, instanceIds: ['ec2'], sharedWith: [] });
  });

  it('separates a service in another namespace, which deploys in a policy of its own', () => {
    renderStep({
      ...twoServices,
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: { ...varsFor('lambda', 'lambda'), namespace: 'prod' },
      },
    });

    openFlyout('ec2');

    expect(shownPolicy().sharedWith).toStrictEqual([]);
  });

  it('groups an empty namespace with the explicit default one for managed', () => {
    renderStep({
      ...twoServices,
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: { ...varsFor('lambda', 'lambda'), namespace: 'default' },
      },
      deploymentMethod: 'managed_integration',
    });

    openFlyout('ec2');

    expect(shownPolicy().sharedWith).toStrictEqual(['Name lambda']);
  });

  it('keeps an empty and an explicit default namespace apart for agent-based', () => {
    renderStep({
      ...twoServices,
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: { ...varsFor('lambda', 'lambda'), namespace: 'default' },
      },
      deploymentMethod: 'agent_based',
    });

    openFlyout('ec2');

    // An empty namespace inherits the agent policy's, so it is not the explicit `default` one.
    expect(shownPolicy().sharedWith).toStrictEqual([]);
  });

  it('gives a duplicate a policy of its own', () => {
    renderStep({
      instances: [instance('ec2'), instance('ec2__dup-1', true)],
      services: [ec2],
      stored: { 'ec2__dup-1': varsFor('ec2', 'aws.prod', false) },
    });

    openFlyout('ec2__dup-1');

    expect(screen.getByTestId('mockFlyout')).toHaveTextContent('null');
  });

  it('gives no policy for a service the switch does not apply to', () => {
    renderStep({
      instances: [instance('ec2')],
      services: [ec2],
      stored: { ec2: varsFor('ec2', 'generic') },
    });

    openFlyout('ec2');

    expect(screen.getByTestId('mockFlyout')).toHaveTextContent('null');
  });

  it('writes a change to every service of the policy, in the same update', () => {
    const { setServiceFieldsAndInputs } = renderStep({ ...twoServices, stored: {} });
    openFlyout('ec2');

    fireEvent.click(screen.getByTestId('mockApplyOff'));

    expect(setServiceFieldsAndInputs.mock.calls[0][5]).toStrictEqual({
      instanceIds: ['ec2', 'lambda'],
      enabled: false,
    });
  });

  it('reaches the other services when the save is what first brings the service into the policy', () => {
    // EC2 is saved with the generic dataset, so the switch does not apply to it yet.
    const { setServiceFieldsAndInputs } = renderStep({
      ...twoServices,
      stored: { ec2: varsFor('ec2', 'generic') },
    });
    openFlyout('ec2');
    expect(screen.getByTestId('mockFlyout')).toHaveTextContent('null');

    // The user picks a custom dataset and turns the switch off in the same save.
    fireEvent.click(screen.getByTestId('mockApplyCustomOff'));

    expect(setServiceFieldsAndInputs.mock.calls[0][5]).toStrictEqual({
      instanceIds: ['ec2', 'lambda'],
      enabled: false,
    });
  });

  it('writes nothing for the policy when the choice was not changed', () => {
    const { setServiceFieldsAndInputs } = renderStep({ ...twoServices, stored: {} });
    openFlyout('ec2');

    fireEvent.click(screen.getByTestId('mockApplyUntouched'));

    expect(setServiceFieldsAndInputs.mock.calls[0][5]).toBeUndefined();
  });
});
