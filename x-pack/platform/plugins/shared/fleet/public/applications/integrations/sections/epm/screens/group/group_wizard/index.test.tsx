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
import { of } from 'rxjs';

import {
  sendCreatePackagePolicyForRq,
  sendGetAgents,
  sendGetDataStreams,
  sendGetPackageInfoByKeyForRq,
} from '../../../../../../../hooks';

import { nginxOtelPackageInfo, nginxPackageInfo } from './__fixtures__/nginx';
import { apacheInputOtelPackageInfo, apachePackageInfo } from './__fixtures__/apache';
import { apacheGroupItem, nginxGroupItem, singleSchemaGroupItem } from './__fixtures__/groups';

import { buildSchemaModel, getTargetDataset } from './model';
import { DetectStep } from './detect_step';

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
  sendGetPackageInfoByKey: jest.fn().mockResolvedValue({ data: undefined }),
  sendGetDataStreams: jest.fn(),
  sendGetAgents: jest.fn(),
  sendBulkInstallPackages: jest.fn().mockResolvedValue({ data: { items: [] } }),
  sendCreateAgentPolicy: jest.fn().mockResolvedValue({
    data: { item: { id: 'agent-policy-2', name: 'Agent policy 1', namespace: 'default' } },
  }),
  sendCreatePackagePolicyForRq: jest.fn(),
}));

jest.mock('../../../../../../fleet/services/ensure_kibana_assets_installed', () => ({
  ensurePackageKibanaAssetsInstalled: jest.fn().mockResolvedValue(undefined),
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

describe('GroupOnboardingWizard', () => {
  beforeAll(() => {
    jest.spyOn(console, 'debug').mockImplementation(() => {});
  });
  beforeEach(() => {
    (sendGetPackageInfoByKeyForRq as jest.Mock).mockImplementation((name: string) =>
      Promise.resolve({ item: PACKAGES[name] })
    );
    (sendGetDataStreams as jest.Mock).mockResolvedValue({ data_streams: [] });
    (sendGetAgents as jest.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
    (sendCreatePackagePolicyForRq as jest.Mock).mockImplementation((policy) =>
      Promise.resolve({ item: { ...policy, id: 'package-policy-1' } })
    );
  });

  let renderer: ReturnType<typeof createIntegrationsTestRendererMock>;
  const renderWizard = (
    group: PackageListItem,
    options: GroupSchemaOption[],
    projectType?: string,
    host: Partial<React.ComponentProps<typeof GroupOnboardingWizard>> = {}
  ) => {
    renderer = createIntegrationsTestRendererMock();
    renderer.startServices.data.search.search = jest.fn().mockReturnValue(of({})) as any;
    if (projectType) {
      renderer.startServices.cloud = {
        ...renderer.startServices.cloud,
        serverless: { ...renderer.startServices.cloud?.serverless, projectType },
      } as any;
    }
    return renderer.render(
      <GroupOnboardingWizard group={group} options={options} onExit={jest.fn()} {...host} />
    );
  };
  const click = (el: HTMLElement) =>
    act(() => {
      fireEvent.click(el);
    });

  it('Nginx: install order, fields from package metadata, schema switch keeps name + policy', async () => {
    const result = renderWizard(nginxGroupItem, [
      option('otel', nginxOtelPackageInfo),
      option('ecs', nginxPackageInfo),
    ]);

    // What to collect
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardSignal-metrics')).toBeInTheDocument();
    expect(result.getByText('Access Logs')).toBeInTheDocument();
    expect(result.getByText('Error Logs')).toBeInTheDocument();
    expect(result.getByTestId('groupWizardSchema-otel')).toHaveTextContent(
      'Collects: Logs, Metrics'
    );
    // Single deployment method: no "how" step. Rail: collect, logs, metrics, review, detect.
    expect(result.queryByTestId('groupWizardRail-how')).not.toBeInTheDocument();
    expect(result.getByTestId('groupWizardRail-detect')).toHaveTextContent('Detect and review');

    // Logs step: one card per selected stream, fields from the stream vars
    click(result.getByTestId('groupWizardNext'));
    const access = await result.findByTestId('groupWizardStreamCard-nginx.access');
    expect(result.getByTestId('groupWizardStreamCard-nginx.error')).toBeInTheDocument();
    click(within(access).getByText('Nginx Access Logs'));
    expect(within(access).getByText('Access log paths')).toBeInTheDocument();
    expect(within(access).getByText('Start at')).toBeInTheDocument();
    expect(within(access).getByText('logs-nginx.access.otel-<namespace>')).toBeInTheDocument();
    const pathInput = within(access).getByDisplayValue('/var/log/nginx/access.log');
    act(() => {
      fireEvent.change(pathInput, { target: { value: '/srv/access.log' } });
    });

    // Metrics -> review: agent policy + integration name live here when "how" is hidden
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByText('Nginx stub_status Metrics')).toBeInTheDocument());
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardAgentPolicy')).toBeInTheDocument();
    expect(result.getByTestId('groupWizardReview')).toHaveTextContent(
      'plus assets from nginx_otel 0.7.0'
    );
    expect(result.getByTestId('groupWizardReview')).toHaveTextContent(
      'logs-nginx.access.otel-*, logs-nginx.error.otel-*, metrics-nginxreceiver.otel-*'
    );
    await waitFor(() =>
      expect(result.getByTestId('groupWizardPolicyName')).toHaveValue('nginx_otel_integration-1')
    );
    act(() => {
      fireEvent.change(result.getByTestId('groupWizardPolicyName'), {
        target: { value: 'web-servers' },
      });
    });
    act(() => {
      fireEvent.change(result.getByTestId('groupWizardNewPolicyName'), {
        target: { value: 'Web hosts' },
      });
    });
    expect(result.getByTestId('groupWizardSave')).toHaveTextContent('Add Nginx');

    // Switch to ECS from review: name, namespace and agent policy carry over, the path doesn't
    click(result.getAllByTestId('groupWizardEdit-collect')[0]);
    click(within(result.getByTestId('groupWizardSchema-ecs')).getByRole('radio') as HTMLElement);
    await waitFor(() =>
      expect(result.getByTestId('groupWizardCarryOver')).toHaveTextContent('Access log paths')
    );
    click(result.getByTestId('groupWizardSignal-logs').querySelector('input')!);
    click(result.getByTestId('groupWizardNext'));
    // ECS metrics step: shared input var (hosts) + stream var (period)
    await waitFor(() => expect(result.getByText('Hosts')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardStreamCard-nginx.stubstatus')).toBeInTheDocument();
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    await waitFor(() =>
      expect(result.getByTestId('groupWizardPolicyName')).toHaveValue('web-servers')
    );
    expect(result.getByTestId('groupWizardNewPolicyName')).toHaveValue('Web hosts');
  });

  it('zero signals: settings steps skipped, review offers "Install assets only"', async () => {
    const result = renderWizard(nginxGroupItem, [
      option('otel', nginxOtelPackageInfo),
      option('ecs', nginxPackageInfo),
    ]);
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    click(result.getByTestId('groupWizardSignal-logs').querySelector('input')!);
    click(result.getByTestId('groupWizardSignal-metrics').querySelector('input')!);
    expect(result.getByTestId('groupWizardNoSignalsHint')).toBeInTheDocument();
    expect(result.queryByTestId('groupWizardRail-logs')).not.toBeInTheDocument();
    expect(result.getByTestId('groupWizardNext')).not.toBeDisabled();

    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardAssetsOnly')).toHaveTextContent(
      'No data will be collected'
    );
    expect(result.getByTestId('groupWizardReview')).toHaveTextContent('Nothing (assets only)');
    expect(result.getByTestId('groupWizardSave')).toHaveTextContent('Install assets only');
  });

  it('default schema follows the solution: Security -> ECS', async () => {
    const result = renderWizard(
      nginxGroupItem,
      [option('otel', nginxOtelPackageInfo), option('ecs', nginxPackageInfo)],
      'security'
    );
    await waitFor(() =>
      expect(within(result.getByTestId('groupWizardSchema-ecs')).getByRole('radio')).toBeChecked()
    );
    expect(result.getByTestId('groupWizardSchema-ecs')).toHaveTextContent('Recommended');
    expect(result.getByText('Access logs')).toBeInTheDocument();
  });

  it('single-schema group: no schema choice', async () => {
    const result = renderWizard(singleSchemaGroupItem, [option('otel', nginxOtelPackageInfo)]);
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    expect(result.queryByTestId('groupWizardSchemaChoice')).not.toBeInTheDocument();
  });

  it('Apache: same code, OTel input package child with metrics only', async () => {
    const result = renderWizard(apacheGroupItem, [
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

    click(result.getByTestId('groupWizardNext'));
    const card = await result.findByTestId(
      'groupWizardStreamCard-apache_input_otel.apachereceiver'
    );
    click(within(card).getByText('Apache HTTP Server Metrics (OpenTelemetry)'));
    expect(within(card).getByText('Endpoint')).toBeInTheDocument();
    expect(within(card).getByText('metrics-apachereceiver.otel-<namespace>')).toBeInTheDocument();
    // The input package's routing var (required, show_user) is moved under Advanced options
    expect(within(card).queryByText('Dataset name')).not.toBeInTheDocument();
    click(within(card).getByText('Advanced options'));
    expect(within(card).getByText('Dataset name')).toBeInTheDocument();

    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardReview')).toHaveTextContent('(no dashboards)');
    expect(result.getByTestId('groupWizardSave')).toHaveTextContent('Add Apache HTTP Server');
  });

  it('detect and review: per data stream status, inline reasons, non-blocking', async () => {
    const model = buildSchemaModel(nginxOtelPackageInfo);
    const rows = model.streams
      .filter((s) => s.signal === 'logs')
      .map((stream) => ({ stream, dataset: getTargetDataset(stream) }));
    (sendGetDataStreams as jest.Mock).mockResolvedValue({
      data_streams: [
        { dataset: 'nginx.access.otel', type: 'logs', last_activity_ms: Date.now() - 5000 },
      ],
    });
    (sendGetAgents as jest.Mock).mockResolvedValue({ data: { items: [], total: 0 } });
    renderer = createIntegrationsTestRendererMock();
    renderer.startServices.data.search.search = jest.fn().mockReturnValue(
      of({
        rawResponse: {
          aggregations: { datasets: { buckets: [{ key: 'nginx.access.otel', doc_count: 1234 }] } },
        },
      })
    ) as any;
    const onAddAgent = jest.fn();
    const result = renderer.render(
      <DetectStep
        title="Nginx"
        schema="otel"
        pkgName="nginx_otel_integration"
        rows={rows}
        isAgentless={false}
        agentPolicyId="policy-1"
        agentPolicyName="Web hosts"
        onAddAgent={onAddAgent}
        assetsHref="/assets"
      />
    );
    await waitFor(() =>
      expect(
        within(result.getByTestId('groupWizardDetectRow-nginx.access')).getByTestId(
          'groupWizardDetectStatus'
        )
      ).toHaveTextContent('Receiving data · 1,234 events in 15 min')
    );
    expect(
      within(result.getByTestId('groupWizardDetectRow-nginx.error')).getByTestId(
        'groupWizardDetectStatus'
      )
    ).toHaveTextContent('no Elastic Agent enrolled in this agent policy yet');
    expect(sendGetAgents).toHaveBeenCalledWith(
      expect.objectContaining({ kuery: 'policy_id:"policy-1"' })
    );
    click(result.getByTestId('groupWizardAddAgent'));
    expect(onAddAgent).toHaveBeenCalled();
  });

  it('page host: step lives in the URL', async () => {
    const result = renderWizard(nginxGroupItem, [
      option('otel', nginxOtelPackageInfo),
      option('ecs', nginxPackageInfo),
    ]);
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    expect(result.getByTestId('groupWizardBack')).toBeInTheDocument();
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(renderer.mountHistory.location.search).toBe('?step=logs'));
  });

  it('embedded host: local step state, no page header, save -> detect -> host exit', async () => {
    const onExit = jest.fn();
    const onSaved = jest.fn();
    const result = renderWizard(
      nginxGroupItem,
      [option('otel', nginxOtelPackageInfo), option('ecs', nginxPackageInfo)],
      undefined,
      { stepState: 'local', layout: 'embedded', exitLabel: 'Back to Streams', onExit, onSaved }
    );
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    expect(result.queryByTestId('groupWizardBack')).not.toBeInTheDocument();
    expect(result.getByText('View documentation')).toBeInTheDocument();

    // Zero signals -> review -> "Install assets only"
    click(result.getByTestId('groupWizardSignal-logs').querySelector('input')!);
    click(result.getByTestId('groupWizardSignal-metrics').querySelector('input')!);
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    expect(renderer.mountHistory.location.search).toBe('');
    await waitFor(() => expect(result.getByTestId('groupWizardSave')).not.toBeDisabled());
    click(result.getByTestId('groupWizardSave'));

    // Nima's spec: the package policy is still created, with every input off
    await waitFor(() => expect(sendCreatePackagePolicyForRq).toHaveBeenCalled());
    const created = (sendCreatePackagePolicyForRq as jest.Mock).mock.calls[0][0];
    expect(created.package.name).toBe('nginx_otel_integration');
    expect(created.policy_ids).toEqual(['agent-policy-2']);
    expect(created.inputs.map((i: { enabled: boolean }) => i.enabled)).toEqual([false, false]);

    await waitFor(() =>
      expect(result.getByTestId('groupWizardDetectAssetsOnly')).toBeInTheDocument()
    );
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ type: 'packagePolicy' }));
    expect(result.getByTestId('groupWizardDone')).toHaveTextContent('Back to Streams');
    click(result.getByTestId('groupWizardDone'));
    expect(onExit).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'done',
        schema: 'otel',
        packageName: 'nginx_otel_integration',
        saved: expect.objectContaining({ type: 'packagePolicy' }),
      })
    );
  });
});
