/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';

import type { Output } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../../../mock';
import { useFleetStatus } from '../../../../../../hooks/use_fleet_status';
import { ExperimentalFeaturesService } from '../../../../../../services';
import { useStartServices, sendPutOutput } from '../../../../hooks';

import { EditOutputFlyout } from '.';

// mock yaml code editor
jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <>CODE EDITOR</>,
}));

jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn(),
}));

jest.mock('../../../../hooks', () => {
  return {
    ...jest.requireActual('../../../../hooks'),
    useBreadcrumbs: jest.fn(),
    useStartServices: jest.fn(),
    sendPutOutput: jest.fn(),
  };
});

jest.mock('./confirm_update', () => ({
  confirmUpdate: () => jest.fn().mockResolvedValue(true),
}));

const mockSendPutOutput = sendPutOutput as jest.MockedFunction<typeof sendPutOutput>;
const mockUseStartServices = useStartServices as jest.Mock;

const mockedUseFleetStatus = useFleetStatus as jest.MockedFunction<typeof useFleetStatus>;

function renderFlyout(output?: Output) {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(
    <EditOutputFlyout proxies={[]} output={output} onClose={() => {}} />
  );

  return { utils };
}

const logstashInputsLabels = [
  'Client SSL certificate key',
  'Client SSL certificate',
  'Server SSL certificate authorities (optional)',
];

const kafkaInputsLabels = [
  'Partitioning strategy',
  'Number of events',
  'Default topic',
  'Key',
  'Value',
  'Broker timeout',
  'Broker reachability timeout',
  'ACK Reliability',
  'Key (optional)',
];

const kafkaSectionsLabels = [
  'Authentication',
  'Partitioning',
  'Topics',
  'Headers',
  'Compression',
  'Broker settings',
];

const remoteEsOutputLabels = ['Hosts', 'Service token'];

describe('EditOutputFlyout', () => {
  const mockStartServices = (isServerlessEnabled?: boolean) => {
    mockUseStartServices.mockReturnValue({
      notifications: {
        toasts: {
          addError: jest.fn(),
        },
      },
      docLinks: {
        links: { fleet: {}, logstash: {}, kibana: {} },
      },
      cloud: {
        isServerlessEnabled,
      },
    });
  };

  beforeEach(() => {
    mockStartServices(false);
    jest.clearAllMocks();

    mockedUseFleetStatus.mockReturnValue({} as any);
  });

  it('should render the flyout if there is not output provided', async () => {
    renderFlyout();
  });

  it('should render the flyout if the output provided is a ES output', async () => {
    const { utils } = renderFlyout({
      type: 'elasticsearch',
      name: 'elasticsearch output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    expect(
      utils.queryByLabelText('Elasticsearch CA trusted fingerprint (optional)')
    ).not.toBeNull();

    // Does not show logstash SSL inputs
    logstashInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    // Does not show kafka inputs nor sections
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).toBeNull();
    });
  });

  it('should render the flyout if the output provided is a logstash output', async () => {
    const { utils } = renderFlyout({
      type: 'logstash',
      name: 'logstash output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show logstash SSL inputs
    logstashInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });

    // Does not show kafka inputs nor sections
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).toBeNull();
    });
  });

  it('should render the flyout if the output provided is a kafka output', async () => {
    const { utils } = renderFlyout({
      type: 'kafka',
      name: 'kafka output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show kafka inputs
    kafkaInputsLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });

    kafkaSectionsLabels.forEach((label) => {
      expect(utils.queryByText(label)).not.toBeNull();
    });

    // Does not show logstash inputs
    ['Client SSL certificate key', 'Client SSL certificate'].forEach((label) => {
      expect(utils.queryByLabelText(label)).toBeNull();
    });
  });

  it('should populate secret input with plain text value when editing kafka output', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({} as any);

    mockedUseFleetStatus.mockReturnValue({
      isLoading: false,
      isReady: true,
      isSecretsStorageEnabled: true,
    } as any);

    const { utils } = renderFlyout({
      type: 'kafka',
      name: 'kafka output',
      id: 'outputK',
      is_default: false,
      is_default_monitoring: false,
      hosts: ['kafka:443'],
      topic: 'topic',
      auth_type: 'ssl',
      version: '1.0.0',
      ssl: { certificate: 'cert', key: 'key', verification_mode: 'full' },
      compression: 'none',
    });

    expect((utils.getByTestId('kafkaSslKeySecretInput') as any).value).toEqual('key');

    fireEvent.click(utils.getByText('Save and apply settings'));

    await waitFor(() => {
      expect(mockSendPutOutput).toHaveBeenCalledWith(
        'outputK',
        expect.objectContaining({
          secrets: { ssl: { key: 'key' } },
          ssl: { certificate: 'cert', key: '', verification_mode: 'full' },
        })
      );
    });
  });

  it('should populate secret password input with plain text value when editing kafka output', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({} as any);

    mockedUseFleetStatus.mockReturnValue({
      isLoading: false,
      isReady: true,
      isSecretsStorageEnabled: true,
    } as any);

    const { utils } = renderFlyout({
      type: 'kafka',
      name: 'kafka output',
      id: 'outputK',
      is_default: false,
      is_default_monitoring: false,
      hosts: ['kafka:443'],
      topic: 'topic',
      auth_type: 'user_pass',
      version: '1.0.0',
      username: 'user',
      password: 'pass',
      compression: 'none',
    });

    expect(
      (utils.getByTestId('settingsOutputsFlyout.kafkaPasswordSecretInput') as any).value
    ).toEqual('pass');

    fireEvent.click(utils.getByText('Save and apply settings'));

    await waitFor(() => {
      expect(mockSendPutOutput).toHaveBeenCalledWith(
        'outputK',
        expect.objectContaining({
          secrets: { password: 'pass' },
        })
      );
      expect((mockSendPutOutput.mock.calls[0][1] as any).password).toBeUndefined();
    });
  });

  it('should populate secret input with plain text value when editing logstash output', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({} as any);

    mockedUseFleetStatus.mockReturnValue({
      isLoading: false,
      isReady: true,
      isSecretsStorageEnabled: true,
    } as any);

    const { utils } = renderFlyout({
      type: 'logstash',
      name: 'logstash output',
      id: 'outputL',
      is_default: false,
      is_default_monitoring: false,
      hosts: ['logstash'],
      ssl: { certificate: 'cert', key: 'key', certificate_authorities: [] },
    });

    expect((utils.getByTestId('sslKeySecretInput') as HTMLInputElement).value).toEqual('key');

    fireEvent.click(utils.getByText('Save and apply settings'));

    await waitFor(() => {
      expect(mockSendPutOutput).toHaveBeenCalledWith(
        'outputL',
        expect.objectContaining({
          secrets: { ssl: { key: 'key' } },
          ssl: { certificate: 'cert', certificate_authorities: [] },
        })
      );
    });
  });

  it('should show a callout in the flyout if the selected output is logstash and no encrypted key is set', async () => {
    mockedUseFleetStatus.mockReturnValue({
      missingOptionalFeatures: ['encrypted_saved_object_encryption_key_required'],
    } as any);
    const { utils } = renderFlyout({
      type: 'logstash',
      name: 'logstash output',
      id: 'output123',
      is_default: false,
      is_default_monitoring: false,
    });

    // Show logstash SSL inputs
    expect(utils.getByText('Additional setup required')).not.toBeNull();
  });

  it('should render the flyout if the output provided is a remote ES output', async () => {
    jest
      .spyOn(ExperimentalFeaturesService, 'get')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);

    mockedUseFleetStatus.mockReturnValue({
      isLoading: false,
      isReady: true,
      isSecretsStorageEnabled: true,
    } as any);

    const { utils } = renderFlyout({
      type: 'remote_elasticsearch',
      name: 'remote es output',
      id: 'outputR',
      is_default: false,
      is_default_monitoring: false,
      kibana_url: 'http://localhost',
      sync_integrations: true,
    });

    remoteEsOutputLabels.forEach((label) => {
      expect(utils.queryByLabelText(label)).not.toBeNull();
    });
    expect(utils.queryByTestId('serviceTokenCallout')).not.toBeNull();

    expect(utils.queryByTestId('settingsOutputsFlyout.typeInput')?.textContent).toContain(
      'Remote Elasticsearch'
    );

    expect(utils.queryByTestId('serviceTokenSecretInput')).not.toBeNull();

    expect(utils.queryByTestId('kibanaAPIKeyCallout')).not.toBeNull();
    expect(
      (utils.getByTestId('settingsOutputsFlyout.kibanaURLInput') as HTMLInputElement).value
    ).toEqual('http://localhost');
    expect(utils.queryByTestId('kibanaAPIKeySecretInput')).not.toBeNull();
  });

  it('should populate secret service token input with plain text value when editing remote ES output', async () => {
    jest
      .spyOn(ExperimentalFeaturesService, 'get')
      .mockReturnValue({ enableSyncIntegrationsOnRemote: true } as any);

    mockedUseFleetStatus.mockReturnValue({
      isLoading: false,
      isReady: true,
      isSecretsStorageEnabled: true,
    } as any);

    const { utils } = renderFlyout({
      type: 'remote_elasticsearch',
      name: 'remote es output',
      id: 'outputR',
      is_default: false,
      is_default_monitoring: false,
      service_token: '1234',
      hosts: ['https://localhost:9200'],
      kibana_api_key: 'key',
    });

    expect((utils.getByTestId('serviceTokenSecretInput') as HTMLInputElement).value).toEqual(
      '1234'
    );
    expect((utils.getByTestId('kibanaAPIKeySecretInput') as HTMLInputElement).value).toEqual('key');

    fireEvent.click(utils.getByText('Save and apply settings'));

    await waitFor(() => {
      expect(mockSendPutOutput).toHaveBeenCalledWith(
        'outputR',
        expect.objectContaining({
          secrets: { service_token: '1234', kibana_api_key: 'key' },
          service_token: undefined,
          kibana_api_key: undefined,
        })
      );
    });
  });

  it('should not display remote ES output in type lists if serverless', async () => {
    jest.spyOn(ExperimentalFeaturesService, 'get').mockReturnValue({} as any);
    mockUseStartServices.mockReset();
    mockStartServices(true);
    const { utils } = renderFlyout({
      type: 'elasticsearch',
      name: 'dummy',
      id: 'output',
      is_default: false,
      is_default_monitoring: false,
    });

    expect(utils.queryByTestId('settingsOutputsFlyout.typeInput')?.textContent).not.toContain(
      'Remote Elasticsearch'
    );
  });
});
