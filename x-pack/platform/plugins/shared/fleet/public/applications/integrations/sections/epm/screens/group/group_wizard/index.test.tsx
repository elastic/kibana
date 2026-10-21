/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: smoke test of the generic wizard UI with real package metadata (no browser was
// available for the spike). Renders Nginx and Apache with the same code.

import React from 'react';
import { act, fireEvent, waitFor, within } from '@testing-library/react';

import { createIntegrationsTestRendererMock } from '../../../../../../../mock';
import type { PackageInfo, PackageListItem } from '../../../../../../../types';
import type { GroupSchemaOption } from '../../../../../../../hooks/use_group_package';
import { sendGetPackageInfoByKeyForRq } from '../../../../../../../hooks';

import { nginxOtelPackageInfo, nginxPackageInfo } from './__fixtures__/nginx';
import { apacheInputOtelPackageInfo, apachePackageInfo } from './__fixtures__/apache';

import { GroupOnboardingWizard } from '.';

jest.mock('../../../../../../../services/use_yaml', () => ({
  useYaml: () => require('yaml'),
}));

jest.mock(
  '../../../../../../fleet/sections/agent_policy/create_package_policy_page/components/steps/components/use_policies',
  () => ({ useAllNonManagedAgentPolicies: jest.fn().mockReturnValue([]) })
);

jest.mock('../../../../../../../hooks', () => ({
  ...jest.requireActual('../../../../../../../hooks'),
  sendGetPackageInfoByKeyForRq: jest.fn(),
  sendGetPackagePolicies: jest.fn().mockResolvedValue({ data: { items: [] } }),
}));

const PACKAGES: Record<string, PackageInfo> = {
  nginx: nginxPackageInfo,
  nginx_otel_integration: nginxOtelPackageInfo,
  apache: apachePackageInfo,
  apache_input_otel: apacheInputOtelPackageInfo,
};

const listItem = (info: PackageInfo) =>
  ({
    id: info.name,
    name: info.name,
    title: info.title,
    version: info.version,
    release: info.release,
    type: info.type,
  } as unknown as PackageListItem);

const option = (schema: string, info: PackageInfo): GroupSchemaOption => ({
  schema,
  packageName: info.name,
  versionConstraint: '*',
  child: listItem(info),
  isInstalled: false,
});

const nginxGroup = {
  id: 'nginx_group',
  name: 'nginx_group',
  title: 'Nginx',
  version: '0.1.0',
  description: 'Collect logs and metrics from Nginx.',
} as unknown as PackageListItem;

const apacheGroup = {
  id: 'apache_group',
  name: 'apache_group',
  title: 'Apache HTTP Server',
  version: '0.1.0',
  description: 'Collect logs and metrics from Apache HTTP Server.',
} as unknown as PackageListItem;

describe('GroupOnboardingWizard', () => {
  beforeAll(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });
  beforeEach(() => {
    (sendGetPackageInfoByKeyForRq as jest.Mock).mockImplementation((name: string) =>
      Promise.resolve({ item: PACKAGES[name] })
    );
  });

  const renderWizard = (group: PackageListItem, options: GroupSchemaOption[]) => {
    const renderer = createIntegrationsTestRendererMock();
    return renderer.render(
      <GroupOnboardingWizard group={group} options={options} defaultSchema="otel" />
    );
  };

  it('Nginx: signals and fields from package metadata, schema switch reports dropped settings', async () => {
    const result = renderWizard(nginxGroup, [
      option('otel', nginxOtelPackageInfo),
      option('ecs', nginxPackageInfo),
    ]);

    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardSignal-metrics')).toBeInTheDocument();
    expect(result.getByText('Access Logs')).toBeInTheDocument();
    expect(result.getByText('Error Logs')).toBeInTheDocument();
    expect(result.getByTestId('groupWizardSchema-otel')).toHaveTextContent(
      'Collects: Logs, Metrics'
    );
    await waitFor(() =>
      expect(result.getByTestId('groupWizardPolicyName')).toHaveValue('nginx_otel_integration-1')
    );

    // Logs step: one card per selected stream, fields from the stream vars
    act(() => {
      fireEvent.click(result.getByTestId('groupWizardNext'));
    });
    const access = await result.findByTestId('groupWizardStreamCard-nginx.access');
    expect(result.getByTestId('groupWizardStreamCard-nginx.error')).toBeInTheDocument();
    act(() => {
      fireEvent.click(within(access).getByText('Nginx Access Logs'));
    });
    expect(within(access).getByText('Access log paths')).toBeInTheDocument();
    expect(within(access).getByText('Start at')).toBeInTheDocument();
    expect(within(access).getByText('logs-nginx.access.otel-<namespace>')).toBeInTheDocument();

    // Edit the path, go back and switch to ECS
    const pathInput = within(access).getByDisplayValue('/var/log/nginx/access.log');
    act(() => {
      fireEvent.change(pathInput, { target: { value: '/srv/access.log' } });
    });
    act(() => {
      fireEvent.click(result.getByTestId('groupWizardRecapEdit'));
    });
    act(() => {
      fireEvent.click(
        within(result.getByTestId('groupWizardSchema-ecs')).getByRole('radio') as HTMLElement
      );
    });
    await waitFor(() =>
      expect(result.getByTestId('groupWizardCarryOver')).toHaveTextContent('Access log paths')
    );
    await waitFor(() => expect(result.getByTestId('groupWizardPolicyName')).toHaveValue('nginx-1'));

    // ECS metrics step: shared input var (hosts) + stream var (period)
    act(() => {
      fireEvent.click(result.getByTestId('groupWizardSignal-logs').querySelector('input')!);
    });
    act(() => {
      fireEvent.click(result.getByTestId('groupWizardNext'));
    });
    await waitFor(() => expect(result.getByText('Hosts')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardStreamCard-nginx.stubstatus')).toBeInTheDocument();
    expect(result.getByTestId('groupWizardSave')).toHaveTextContent('Add Nginx');
  });

  it('Apache: same code, OTel input package child with metrics only', async () => {
    const result = renderWizard(apacheGroup, [
      option('otel', apacheInputOtelPackageInfo),
      option('ecs', apachePackageInfo),
    ]);
    await waitFor(() =>
      expect(result.getByTestId('groupWizardSignal-metrics')).toBeInTheDocument()
    );
    expect(result.queryByTestId('groupWizardSignal-logs')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(result.getByTestId('groupWizardSchema-ecs')).toHaveTextContent(
        'Collects: Logs, Metrics'
      )
    );
    expect(result.getByTestId('groupWizardSchema-otel')).toHaveTextContent('Collects: Metrics');

    act(() => {
      fireEvent.click(result.getByTestId('groupWizardNext'));
    });
    const card = await result.findByTestId(
      'groupWizardStreamCard-apache_input_otel.apachereceiver'
    );
    act(() => {
      fireEvent.click(within(card).getByText('Apache HTTP Server Metrics (OpenTelemetry)'));
    });
    expect(within(card).getByText('Endpoint')).toBeInTheDocument();
    expect(within(card).getByText('metrics-apachereceiver.otel-<namespace>')).toBeInTheDocument();
    // The input package's routing var (required, show_user) is moved under Advanced options
    expect(within(card).queryByText('Dataset name')).not.toBeInTheDocument();
    act(() => {
      fireEvent.click(within(card).getByText('Advanced options'));
    });
    expect(within(card).getByText('Dataset name')).toBeInTheDocument();
    expect(result.getByTestId('groupWizardSave')).toHaveTextContent('Add Apache HTTP Server');
  });
});
