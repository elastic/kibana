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
import type { IntegrationGroup, PackageInfo, PackageListItem } from '../../../../../../../types';
import type { GroupMemberOption } from '../../../../../../../hooks/use_group_package';
import { of } from 'rxjs';

import {
  sendCreatePackagePolicyForRq,
  sendGetAgents,
  sendGetDataStreams,
  sendGetPackageInfoByKeyForRq,
  sendInstallPackage,
} from '../../../../../../../hooks';

import { nginxOtelPackageInfo, nginxPackageInfo } from './__fixtures__/nginx';
import { apacheInputOtelPackageInfo, apachePackageInfo } from './__fixtures__/apache';
import { apacheGroup, nginxGroup, pickAnyGroup, singleSchemaGroup } from './__fixtures__/groups';
import { nginxOtelIntegrationPackageInfo } from './__fixtures__/otel_integrations';

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
  sendInstallPackage: jest.fn().mockResolvedValue({ data: { items: [] } }),
  // PROTOTYPE: asset checklist; nginx_otel has content, everything else none
  sendGetKibanaAssetListForRq: jest.fn((name: string) =>
    Promise.resolve({
      items:
        name === 'nginx_otel'
          ? [
              { type: 'dashboard', id: 'nginx_otel-overview', title: '[Nginx OTel] Overview' },
              { type: 'dashboard', id: 'nginx_otel-traffic', title: '[Nginx OTel] Traffic' },
              { type: 'slo_template', id: 'nginx_otel-availability', title: 'Availability' },
              {
                type: 'alerting_rule_template',
                id: 'fleet-inactivity-monitoring',
                title: 'Nginx inactivity monitoring',
              },
            ]
          : [],
    })
  ),
}));

jest.mock('../../../../../../fleet/services/ensure_kibana_assets_installed', () => ({
  ensurePackageKibanaAssetsInstalled: jest.fn().mockResolvedValue(undefined),
}));

const PACKAGES: Record<string, PackageInfo> = {
  nginx: nginxPackageInfo,
  nginx_otel_integration: nginxOtelPackageInfo,
  nginx_otel: nginxOtelIntegrationPackageInfo,
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

const option = (schema: string, info: PackageInfo): GroupMemberOption => ({
  schema,
  packageName: info.name,
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
    group: IntegrationGroup,
    options: GroupMemberOption[],
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
    const result = renderWizard(nginxGroup, [
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
      'plus content from nginx_otel 0.7.0'
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
    const result = renderWizard(nginxGroup, [
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

  it('default schema: the default member schema (group.yml default), not the solution', async () => {
    const result = renderWizard(
      { ...nginxGroup, default: 'nginx' },
      [option('otel', nginxOtelPackageInfo), option('ecs', nginxPackageInfo)],
      'observability'
    );
    await waitFor(() =>
      expect(within(result.getByTestId('groupWizardSchema-ecs')).getByRole('radio')).toBeChecked()
    );
    expect(result.getByTestId('groupWizardSchema-ecs')).toHaveTextContent('Recommended');
    expect(result.getByText('Access logs')).toBeInTheDocument();
  });

  it('single-schema group: ECS + OTel shown, missing one disabled', async () => {
    const result = renderWizard(singleSchemaGroup, [option('otel', nginxOtelPackageInfo)]);
    await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
    // ECS + OTel always show; the one the integration doesn't have is disabled
    expect(within(result.getByTestId('groupWizardSchema-otel')).getByRole('radio')).toBeChecked();
    expect(result.getByTestId('groupWizardSchema-ecs')).toHaveTextContent(
      'Not available for Nginx'
    );
    expect(within(result.getByTestId('groupWizardSchema-ecs')).getByRole('radio')).toBeDisabled();
  });

  it('pick-any: same-schema members as package cards, one package policy each', async () => {
    (sendCreatePackagePolicyForRq as jest.Mock).mockClear();
    (sendInstallPackage as jest.Mock).mockClear();
    const result = renderWizard(pickAnyGroup, [
      option('ecs', nginxPackageInfo),
      option('ecs', apachePackageInfo),
    ]);
    // Renamed schema + planned schema shown disabled
    await waitFor(() =>
      expect(result.getByTestId('groupWizardSchema-ecs')).toHaveTextContent('Legacy')
    );
    expect(result.getByTestId('groupWizardSchema-prometheus')).toHaveTextContent(
      'Not available yet'
    );
    expect(result.getByTestId('groupWizardSchema-otel')).toHaveTextContent(
      'Not available for Web servers'
    );
    expect(
      within(result.getByTestId('groupWizardSchema-prometheus')).getByRole('radio')
    ).toBeDisabled();
    // Default member checked, the other opt-in
    await waitFor(() =>
      expect(
        within(result.getByTestId('groupWizardPackage-nginx')).getAllByRole('checkbox').length
      ).toBeGreaterThan(1)
    );
    const nginxCard = result.getByTestId('groupWizardPackage-nginx');
    const apacheCard = result.getByTestId('groupWizardPackage-apache');
    expect(within(nginxCard).getAllByRole('checkbox')[0]).toBeChecked();
    expect(within(nginxCard).getAllByRole('checkbox')[0]).not.toBeDisabled();
    // Unchecking the only selected package is a no-op
    click(within(nginxCard).getAllByRole('checkbox')[0]);
    expect(within(nginxCard).getAllByRole('checkbox')[0]).toBeChecked();
    expect(within(apacheCard).getAllByRole('checkbox')).toHaveLength(1);
    click(within(apacheCard).getAllByRole('checkbox')[0]);
    await waitFor(() =>
      expect(
        within(result.getByTestId('groupWizardPackage-apache')).getAllByRole('checkbox').length
      ).toBeGreaterThan(1)
    );

    // Settings steps: one section per package
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByText('Nginx: Logs')).toBeInTheDocument());
    expect(result.getByText('Apache HTTP Server: Logs')).toBeInTheDocument();
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByText('Nginx: Metrics')).toBeInTheDocument());
    click(result.getByTestId('groupWizardNext'));
    await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
    await waitFor(() =>
      expect(result.getByTestId('groupWizardReviewExtra-apache')).toHaveTextContent('apache-1')
    );

    await waitFor(() => expect(result.getByTestId('groupWizardSave')).not.toBeDisabled());
    click(result.getByTestId('groupWizardSave'));
    await waitFor(() => expect(sendCreatePackagePolicyForRq).toHaveBeenCalledTimes(2));
    const [first, second] = (sendCreatePackagePolicyForRq as jest.Mock).mock.calls.map((c) => c[0]);
    expect(first.package.name).toBe('nginx');
    expect(second.package.name).toBe('apache');
    expect(second.policy_ids).toEqual(first.policy_ids);
    expect(second.policy_ids.length).toBe(1);
    // All content selected: stock install (no skip option)
    expect(sendInstallPackage).toHaveBeenCalledWith('apache', '3.0.2', false, {
      skipKibanaAssets: undefined,
    });
    (sendCreatePackagePolicyForRq as jest.Mock).mockClear();
    (sendInstallPackage as jest.Mock).mockClear();
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
    expect(result.getByTestId('groupWizardInstalls')).toHaveTextContent(
      'No content in this package.'
    );
    expect(result.queryByTestId('groupWizardContent')).not.toBeInTheDocument();
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
    const result = renderWizard(nginxGroup, [
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
      nginxGroup,
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

  // PROTOTYPE: granular "assets to install", nginx_otel 1.0.0 with inline content
  describe('Content to install', () => {
    beforeEach(() => {
      (sendCreatePackagePolicyForRq as jest.Mock).mockClear();
      (sendInstallPackage as jest.Mock).mockClear();
    });

    const toReview = async () => {
      const result = renderWizard(nginxGroup, [
        option('otel', nginxOtelIntegrationPackageInfo),
        option('ecs', nginxPackageInfo),
      ]);
      await waitFor(() => expect(result.getByTestId('groupWizardSignal-logs')).toBeInTheDocument());
      click(result.getByTestId('groupWizardSignal-logs').querySelector('input')!);
      click(result.getByTestId('groupWizardSignal-metrics').querySelector('input')!);
      click(result.getByTestId('groupWizardNext'));
      await waitFor(() => expect(result.getByTestId('groupWizardReview')).toBeInTheDocument());
      return result;
    };

    it('everything selected by default: stock save, assets listed by type', async () => {
      const result = await toReview();
      await waitFor(() =>
        expect(result.getByTestId('groupWizardAssets-nginx_otel')).toHaveTextContent(
          '4 of 4 selected'
        )
      );
      expect(result.getByTestId('groupWizardAssetType-nginx_otel-dashboard')).toBeChecked();
      expect(result.getByTestId('groupWizardInstalls')).toHaveTextContent(
        'plus 4 of 4 content assets (2 dashboards, 1 alert templates, 1 slo templates)'
      );
      await waitFor(() => expect(result.getByTestId('groupWizardSave')).not.toBeDisabled());
      click(result.getByTestId('groupWizardSave'));
      await waitFor(() => expect(sendCreatePackagePolicyForRq).toHaveBeenCalled());
      expect(sendInstallPackage).not.toHaveBeenCalled();
    });

    it('unchecked assets are left out of the install, by type + id', async () => {
      const result = await toReview();
      await waitFor(() =>
        expect(result.getByTestId('groupWizardAsset-dashboard-nginx_otel-traffic')).toBeChecked()
      );
      click(result.getByTestId('groupWizardAsset-dashboard-nginx_otel-traffic'));
      click(result.getByTestId('groupWizardAssetType-nginx_otel-alerting_rule_template'));
      // Type checkbox goes indeterminate when only some of its assets are selected
      expect(
        (result.getByTestId('groupWizardAssetType-nginx_otel-dashboard') as HTMLInputElement)
          .indeterminate
      ).toBe(true);
      expect(result.getByTestId('groupWizardInstalls')).toHaveTextContent(
        'plus 2 of 4 content assets'
      );
      await waitFor(() => expect(result.getByTestId('groupWizardSave')).not.toBeDisabled());
      click(result.getByTestId('groupWizardSave'));
      await waitFor(() => expect(sendCreatePackagePolicyForRq).toHaveBeenCalled());
      expect(sendInstallPackage).toHaveBeenCalledWith('nginx_otel', '1.0.0', false, {
        skipKibanaAssets: [
          { type: 'dashboard', id: 'nginx_otel-traffic' },
          { type: 'alerting_rule_template', id: 'fleet-inactivity-monitoring' },
        ],
      });
    });

    it('nothing selected: installs without Kibana assets', async () => {
      const result = await toReview();
      await waitFor(() => expect(result.getByText('Select none')).toBeInTheDocument());
      click(result.getByText('Select none'));
      expect(result.getByTestId('groupWizardInstalls')).toHaveTextContent(
        'Elasticsearch assets (index templates, ingest pipelines) only.'
      );
      await waitFor(() => expect(result.getByTestId('groupWizardSave')).not.toBeDisabled());
      click(result.getByTestId('groupWizardSave'));
      await waitFor(() => expect(sendCreatePackagePolicyForRq).toHaveBeenCalled());
      expect(sendInstallPackage).toHaveBeenCalledWith('nginx_otel', '1.0.0', false, {
        skipKibanaAssets: true,
      });
    });

    it('already installed: shows the saved selection read-only', async () => {
      (sendGetPackageInfoByKeyForRq as jest.Mock).mockImplementation((name: string) =>
        Promise.resolve({
          item: {
            ...PACKAGES[name],
            installationInfo: {
              install_status: 'installed',
              skipped_kibana_assets: [{ type: 'slo_template', id: 'nginx_otel-availability' }],
            },
          },
        })
      );
      const result = await toReview();
      await waitFor(() =>
        expect(result.getByTestId('groupWizardAssets-nginx_otel')).toHaveTextContent(
          '3 of 4 selected'
        )
      );
      expect(
        result.getByTestId('groupWizardAsset-slo_template-nginx_otel-availability')
      ).not.toBeChecked();
      expect(result.getByTestId('groupWizardAsset-dashboard-nginx_otel-traffic')).toBeDisabled();
      expect(result.getByTestId('groupWizardReview')).toHaveTextContent(
        'is already installed with this selection'
      );
    });
  });
});
