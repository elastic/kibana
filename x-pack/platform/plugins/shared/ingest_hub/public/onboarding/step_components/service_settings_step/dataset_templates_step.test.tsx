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
    datasetTemplatesBundle,
  }: {
    datasetTemplatesBundle?: { requiredBy: string[]; sharedWith: string[] };
  }) => <div data-test-subj="mockFlyout">{JSON.stringify(datasetTemplatesBundle ?? null)}</div>,
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
      ...(createDatasetTemplates !== undefined ? { createDatasetTemplates } : {}),
    },
  },
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
    setServiceFieldsAndInputs: jest.fn(),
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
};

const openFlyout = (instanceId: string) =>
  fireEvent.click(screen.getByTestId(`serviceSettingsStep-serviceLink-${instanceId}`));

const shownBundle = () => JSON.parse(screen.getByTestId('mockFlyout').textContent ?? 'null');

describe('ServiceSettingsStep — services that share a dataset template policy', () => {
  const ec2 = makeOtel('ec2');
  const lambda = makeOtel('lambda');

  it('tells the flyout which other service in the policy needs its template', () => {
    renderStep({
      instances: [instance('ec2'), instance('lambda')],
      services: [ec2, lambda],
      // Lambda still sits at its default dataset, so it cannot opt out.
      stored: { ec2: varsFor('ec2', 'aws.prod', false), lambda: varsFor('lambda', 'lambda') },
    });

    openFlyout('ec2');

    expect(shownBundle()).toStrictEqual({
      requiredBy: ['Name lambda'],
      sharedWith: ['Name lambda'],
    });
  });

  it('does not pull in a service of another package, which deploys in a policy of its own', () => {
    const other = makeOtel('lambda', 'aws_other_input_otel');
    renderStep({
      instances: [instance('ec2'), instance('lambda')],
      services: [ec2, other],
      stored: { ec2: varsFor('ec2', 'aws.prod', false) },
    });

    openFlyout('ec2');

    expect(shownBundle()).toStrictEqual({ requiredBy: [], sharedWith: [] });
  });

  it('separates a service in another namespace, which deploys in a policy of its own', () => {
    renderStep({
      instances: [instance('ec2'), instance('lambda')],
      services: [ec2, lambda],
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: { ...varsFor('lambda', 'lambda'), namespace: 'prod' },
      },
    });

    openFlyout('ec2');

    expect(shownBundle()).toStrictEqual({ requiredBy: [], sharedWith: [] });
  });

  it('groups an empty namespace with the explicit default one for managed', () => {
    const stored = {
      ec2: varsFor('ec2', 'aws.prod', false),
      lambda: { ...varsFor('lambda', 'lambda'), namespace: 'default' },
    };
    const props = {
      instances: [instance('ec2'), instance('lambda')],
      services: [ec2, lambda],
      stored,
    };

    renderStep({ ...props, deploymentMethod: 'managed_integration' });
    openFlyout('ec2');
    expect(shownBundle().sharedWith).toStrictEqual(['Name lambda']);
  });

  it('keeps an empty and an explicit default namespace apart for agent-based', () => {
    renderStep({
      instances: [instance('ec2'), instance('lambda')],
      services: [ec2, lambda],
      stored: {
        ec2: varsFor('ec2', 'aws.prod', false),
        lambda: { ...varsFor('lambda', 'lambda'), namespace: 'default' },
      },
      deploymentMethod: 'agent_based',
    });

    openFlyout('ec2');

    // An empty namespace inherits the agent policy's, so it is not the explicit `default` one.
    expect(shownBundle()).toStrictEqual({ requiredBy: [], sharedWith: [] });
  });

  it('gives a duplicate a bundle of its own', () => {
    renderStep({
      instances: [instance('ec2'), instance('ec2__dup-1', true)],
      services: [ec2],
      stored: { ec2: varsFor('ec2', 'aws.ec2'), 'ec2__dup-1': varsFor('ec2', 'aws.prod', false) },
    });

    openFlyout('ec2__dup-1');

    expect(screen.getByTestId('mockFlyout')).toHaveTextContent('null');
  });
});
