/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: generic wizard model against real package metadata (Nginx + Apache groups).

import { cloneDeep } from 'lodash';
import { parse } from 'yaml';
import { validateAgentConditionExpression } from '@kbn/elastic-agent-condition-language';

import {
  packageToPackagePolicy,
  validatePackagePolicy,
  validationHasErrors,
} from '../../../../../../../../common/services';
import type { NewPackagePolicy, PackageInfo } from '../../../../../../../types';
import { isAdvancedVar } from '../../../../../../fleet/sections/agent_policy/create_package_policy_page/services';

import { nginxOtelPackageInfo, nginxPackageInfo } from './__fixtures__/nginx';
import { apacheInputOtelPackageInfo, apachePackageInfo } from './__fixtures__/apache';
import {
  apacheOtelIntegrationPackageInfo,
  nginxOtelIntegrationPackageInfo,
} from './__fixtures__/otel_integrations';
import {
  getGroupDefaultSchema,
  getGroupSchemas,
  getPackageSchema,
  getSchemaLabel,
} from '../../../../../../../../common/services';
import { SetupTechnology } from '../../../../../../../../common/types';

import { nginxGroup, pickAnyGroup, singleSchemaGroup } from './__fixtures__/groups';
import type { SchemaModel, SchemaState, WizardStream } from './model';
import {
  getAgentInputErrors,
  getContentInstallText,
  getDeploymentMethods,
  getDetectStatus,
  getInstallSummary,
  getGroupSteps,
  getSchemaInfo,
  getDataStreamChoices,
  toggleDataStreamChoice,
  applySchemaState,
  buildSchemaModel,
  carryOverSchemaState,
  emptySchemaState,
  getDatasetVarValue,
  getSteps,
  getTargetDataStreamPattern,
  getVarErrors,
  inputVarPath,
  pairStreams,
  streamVarPath,
  toInputVar,
  toStreamVar,
} from './model';

const deps = { safeLoadYaml: parse, conditionValidator: validateAgentConditionExpression };

const streamBy = (model: SchemaModel, dataset: string) =>
  model.streams.find((s) => s.dataset === dataset)!;

const visibleVars = (stream: WizardStream) =>
  stream.vars.filter((v) => !isAdvancedVar(v)).map((v) => v.name);
const advancedVars = (stream: WizardStream) =>
  stream.vars.filter((v) => isAdvancedVar(v)).map((v) => v.name);

/** New package policy as the stock form creates it, with wizard state applied. */
const policyFor = (pkg: PackageInfo, model: SchemaModel, state: SchemaState) => {
  const base = packageToPackagePolicy(pkg, [], 'default', `${pkg.name}-1`);
  return { ...base, ...applySchemaState(base, model, state) } as NewPackagePolicy;
};

describe('group wizard model', () => {
  describe('Nginx ECS (nginx)', () => {
    const model = buildSchemaModel(nginxPackageInfo);

    it('reads signals, streams and inputs from the package', () => {
      expect(model.signals).toEqual(['logs', 'metrics']);
      expect(model.streams.map((s) => [s.signal, s.dataset, s.title])).toEqual([
        ['logs', 'nginx.access', 'Nginx access logs'],
        ['logs', 'nginx.error', 'Nginx error logs'],
        ['metrics', 'nginx.stubstatus', 'Nginx stub status metrics'],
      ]);
      expect(model.inputs.map((i) => [i.key, i.validationKey])).toEqual([
        ['nginx-logfile', 'logfile'],
        ['nginx-nginx/metrics', 'nginx/metrics'],
      ]);
      expect(model.streams.every((s) => !s.isOtel)).toBe(true);
    });

    it('splits visible and advanced vars from show_user / required', () => {
      const access = streamBy(model, 'nginx.access');
      expect(visibleVars(access)).toEqual(['paths', 'preserve_original_event']);
      expect(advancedVars(access)).toEqual(['tags', 'processors', 'ignore_older']);
      const metricsInput = model.inputs.find((i) => i.type === 'nginx/metrics')!;
      expect(metricsInput.vars.filter((v) => !isAdvancedVar(v)).map((v) => v.name)).toEqual([
        'hosts',
      ]);
      expect(visibleVars(streamBy(model, 'nginx.stubstatus'))).toEqual(['period']);
    });

    it('computes target data streams', () => {
      expect(model.streams.map((s) => getTargetDataStreamPattern(s))).toEqual([
        'logs-nginx.access-*',
        'logs-nginx.error-*',
        'metrics-nginx.stubstatus-*',
      ]);
    });
  });

  describe('Nginx OTel (nginx_otel_integration, composable)', () => {
    const model = buildSchemaModel(nginxOtelPackageInfo);

    it('reads named otelcol inputs and their streams', () => {
      expect(model.signals).toEqual(['logs', 'metrics']);
      expect(model.inputs.map((i) => [i.key, i.type, i.name])).toEqual([
        ['nginx-nginx_otel_input', 'otelcol', 'nginx_otel_input'],
        ['nginx-filelog_otel', 'otelcol', 'filelog_otel'],
      ]);
      // Streams follow the policy template's input order (metrics input first here).
      expect(model.streams.map((s) => [s.inputKey, s.dataset])).toEqual([
        ['nginx-nginx_otel_input', 'nginxreceiver'],
        ['nginx-filelog_otel', 'nginx.access'],
        ['nginx-filelog_otel', 'nginx.error'],
      ]);
      expect(model.streams.every((s) => s.isOtel)).toBe(true);
    });

    it('shows few fields, the rest under advanced', () => {
      const access = streamBy(model, 'nginx.access');
      expect(visibleVars(access)).toEqual(['include', 'start_at']);
      expect(advancedVars(access)).toHaveLength(23);
      expect(visibleVars(streamBy(model, 'nginx.error'))).toEqual([
        'include',
        'start_at',
        'multiline_line_start_pattern',
        'timezone',
      ]);
      expect(visibleVars(streamBy(model, 'nginxreceiver'))).toEqual([
        'endpoint',
        'collection_interval',
      ]);
    });

    it('suffixes OTel target data streams with .otel', () => {
      expect(model.streams.map((s) => getTargetDataStreamPattern(s))).toEqual([
        'metrics-nginxreceiver.otel-*',
        'logs-nginx.access.otel-*',
        'logs-nginx.error.otel-*',
      ]);
    });
  });

  // PROTOTYPE: package structure design - self-contained OTel integrations, inline otelcol streams.
  describe('Nginx OTel (nginx_otel 1.0.0, self-contained integration)', () => {
    const model = buildSchemaModel(nginxOtelIntegrationPackageInfo);

    it('reads one otelcol input with all three streams, same targets as the composable one', () => {
      expect(model.inputs.map((i) => [i.key, i.type])).toEqual([['nginx-otelcol', 'otelcol']]);
      expect(model.streams.map((s) => getTargetDataStreamPattern(s))).toEqual([
        'logs-nginx.access.otel-*',
        'logs-nginx.error.otel-*',
        'metrics-nginxreceiver.otel-*',
      ]);
      expect(visibleVars(streamBy(model, 'nginxreceiver'))).toEqual([
        'endpoint',
        'collection_interval',
      ]);
    });

    it('Apache OTel integration has the input package settings', () => {
      const apache = buildSchemaModel(apacheOtelIntegrationPackageInfo);
      expect(apache.streams.map((s) => getTargetDataStreamPattern(s))).toEqual([
        'metrics-apachereceiver.otel-*',
      ]);
      expect(streamBy(apache, 'apachereceiver').vars.map((v) => v.name)).toContain('endpoint');
    });
  });

  describe('steps (install order)', () => {
    const model = buildSchemaModel(nginxPackageInfo);
    it('collect -> settings per selected signal -> review -> detect', () => {
      expect(getSteps(model, emptySchemaState())).toEqual([
        'collect',
        'logs',
        'metrics',
        'review',
        'detect',
      ]);
      const metrics = streamBy(model, 'nginx.stubstatus');
      expect(getSteps(model, { ...emptySchemaState(), enabled: { [metrics.id]: false } })).toEqual([
        'collect',
        'logs',
        'review',
        'detect',
      ]);
    });

    it('zero signals skips the settings steps', () => {
      const none = Object.fromEntries(model.streams.map((s) => [s.id, false]));
      expect(getSteps(model, { ...emptySchemaState(), enabled: none })).toEqual([
        'collect',
        'review',
        'detect',
      ]);
    });

    it('zero signals: the stock package policy has every input off and still validates', () => {
      const otel = buildSchemaModel(nginxOtelPackageInfo);
      const none = Object.fromEntries(otel.streams.map((s) => [s.id, false]));
      const policy = policyFor(nginxOtelPackageInfo, otel, {
        ...emptySchemaState(),
        enabled: none,
      });
      expect(policy.inputs.map((i) => i.enabled)).toEqual([false, false]);
      expect(validationHasErrors(validatePackagePolicy(policy, nginxOtelPackageInfo, deps))).toBe(
        false
      );
    });

    it('"how" only shows when there is more than one deployment method', () => {
      expect(getDeploymentMethods(model, true)).toEqual([SetupTechnology.AGENT_BASED]);
      const agentless = { ...model, supportsAgentless: true };
      expect(getDeploymentMethods(agentless, false)).toEqual([SetupTechnology.AGENT_BASED]);
      expect(getDeploymentMethods(agentless, true)).toEqual([
        SetupTechnology.AGENTLESS,
        SetupTechnology.AGENT_BASED,
      ]);
      expect(getDeploymentMethods({ ...agentless, agentlessOnly: true }, true)).toEqual([
        SetupTechnology.AGENTLESS,
      ]);
      expect(getSteps(model, emptySchemaState(), { showHow: true }).slice(0, 2)).toEqual([
        'collect',
        'how',
      ]);
    });
  });

  describe('schema', () => {
    it('explicit manifest schema, else otelcol inputs -> otel, else ecs', () => {
      expect(getPackageSchema(nginxPackageInfo)).toBe('ecs');
      expect(getPackageSchema(nginxOtelIntegrationPackageInfo)).toBe('otel');
      // Input package: the template's `input`
      expect(getPackageSchema(apacheInputOtelPackageInfo)).toBe('otel');
      expect(getPackageSchema({ ...nginxPackageInfo, schema: 'ocsf' })).toBe('ocsf');
    });

    it('group schemas: default member first, distinct, planned left out', () => {
      expect(getGroupSchemas(nginxGroup)).toEqual(['otel', 'ecs']);
      expect(getGroupDefaultSchema({ ...nginxGroup, default: 'nginx' })).toBe('ecs');
      expect(getGroupSchemas({ ...nginxGroup, default: 'nginx' })).toEqual(['ecs', 'otel']);
      expect(getGroupSchemas(singleSchemaGroup)).toEqual(['otel']);
      expect(getGroupSchemas(pickAnyGroup)).toEqual(['ecs']);
    });

    it('group schema_labels rename a schema', () => {
      expect(getSchemaLabel('ecs', pickAnyGroup)).toBe('Legacy');
      expect(getSchemaLabel('otel', pickAnyGroup)).toBe('OTel');
      expect(getSchemaInfo('ecs', pickAnyGroup.schema_labels).title).toBe('Legacy');
      expect(getSchemaInfo('prometheus').title).toBe('Prometheus');
    });

    it('one checkbox per data stream, even when several inputs collect it', () => {
      const model = buildSchemaModel(nginxPackageInfo);
      const access = model.streams.find((st) => st.dataset === 'nginx.access')!;
      const twoInputs = {
        ...model,
        streams: [
          ...model.streams,
          { ...access, id: `other/${access.id}`, inputKey: 'other', enabledByDefault: false },
        ],
      };
      const choices = getDataStreamChoices(twoInputs, 'logs');
      expect(choices.map((c) => c.key)).toEqual(['logs-nginx.access', 'logs-nginx.error']);
      expect(choices[0].streams).toHaveLength(2);
      // On: default-enabled streams only. Off: all.
      expect(toggleDataStreamChoice(choices[0], true)).toEqual({
        [access.id]: true,
        [`other/${access.id}`]: false,
      });
      expect(Object.values(toggleDataStreamChoice(choices[0], false))).toEqual([false, false]);
    });

    it('push sources (Supabase Log Drain) add their signal step until turned off', () => {
      const supabase = { ...buildSchemaModel(apacheInputOtelPackageInfo), packageName: 'supabase' };
      expect(getGroupSteps([{ model: supabase, state: emptySchemaState() }])).toEqual([
        'collect',
        'logs',
        'metrics',
        'review',
        'detect',
      ]);
      const off = { ...emptySchemaState(), push: { 'supabase-log-drain': false } };
      expect(getGroupSteps([{ model: supabase, state: off }])).toEqual([
        'collect',
        'metrics',
        'review',
        'detect',
      ]);
    });

    it('pick-any: one settings step per signal across selected packages', () => {
      const nginx = buildSchemaModel(nginxPackageInfo);
      const apache = buildSchemaModel(apacheInputOtelPackageInfo);
      expect(
        getGroupSteps([
          { model: apache, state: emptySchemaState() },
          { model: nginx, state: emptySchemaState() },
        ])
      ).toEqual(['collect', 'logs', 'metrics', 'review', 'detect']);
    });
  });

  describe('review', () => {
    it('lists the child and the content packages it installs', () => {
      expect(getInstallSummary(nginxOtelPackageInfo)).toEqual({
        packageTitle: 'Nginx (OpenTelemetry)',
        packageVersion: '0.1.0',
        dashboards: 0,
        otherKibanaAssets: 0,
        elasticsearchAssets: 0,
        contentPackages: [{ package: 'nginx_otel', version: '0.7.0' }],
      });
      // Input packages can't require content packs: nothing to show for Apache OTel.
      expect(getInstallSummary(apacheInputOtelPackageInfo).contentPackages).toEqual([]);
    });
  });

  // PROTOTYPE: "Install content" review text
  describe('content', () => {
    const summary = getInstallSummary(nginxOtelIntegrationPackageInfo);

    it('lists content when on, what is skipped when off', () => {
      expect(getContentInstallText(summary, true)).toEqual({
        hasContent: true,
        installed:
          'Nginx OpenTelemetry 1.0.0: Elasticsearch assets (index templates, ingest pipelines), plus content: 3 dashboards and 8 other Kibana assets (alert and SLO templates, ML jobs, saved searches).',
      });
      expect(getContentInstallText(summary, false)).toEqual({
        hasContent: true,
        installed:
          'Nginx OpenTelemetry 1.0.0: Elasticsearch assets (index templates, ingest pipelines) only.',
        skipped:
          'Not installed: 3 dashboards and 8 other Kibana assets (alert and SLO templates, ML jobs, saved searches). Reinstall Nginx OpenTelemetry with content to add them later.',
      });
    });

    it('no checkbox for packages without content of their own', () => {
      expect(getContentInstallText(getInstallSummary(apacheInputOtelPackageInfo), true)).toEqual({
        hasContent: false,
        installed:
          'Apache HTTP Server (OpenTelemetry) 0.1.2: Elasticsearch assets (index templates, ingest pipelines). No content in this package.',
      });
      expect(getContentInstallText(getInstallSummary(nginxOtelPackageInfo), true).installed).toBe(
        'Nginx (OpenTelemetry) 0.1.0: Elasticsearch assets (index templates, ingest pipelines), plus content from nginx_otel 0.7.0.'
      );
    });
  });

  describe('detect and review', () => {
    const model = buildSchemaModel(nginxOtelPackageInfo);
    const access = streamBy(model, 'nginx.access');
    const dataset = 'nginx.access.otel';
    const now = 1_000_000_000;
    const agents = { total: 1, online: 1, inputErrors: {} };

    it('waiting, with the reason', () => {
      const base = { stream: access, dataset, dataStreams: [], now };
      expect(getDetectStatus(base)).toEqual({ kind: 'waiting', reason: 'checking' });
      expect(getDetectStatus({ ...base, agents: { ...agents, total: 0, online: 0 } })).toEqual({
        kind: 'waiting',
        reason: 'no_agents',
      });
      expect(getDetectStatus({ ...base, agents: { ...agents, online: 0 } })).toEqual({
        kind: 'waiting',
        reason: 'agents_offline',
      });
      expect(getDetectStatus({ ...base, agents })).toEqual({
        kind: 'waiting',
        reason: 'no_data_yet',
      });
      // Stale data stream (older than 10 min) still counts as waiting
      expect(
        getDetectStatus({
          ...base,
          agents,
          dataStreams: [{ dataset, type: 'logs', last_activity_ms: now - 11 * 60 * 1000 }],
        })
      ).toEqual({ kind: 'waiting', reason: 'no_data_yet' });
    });

    it('receiving with count and last seen; errors win and stay on the row', () => {
      const dataStreams = [{ dataset, type: 'logs', last_activity_ms: now - 1000 }];
      expect(
        getDetectStatus({
          stream: access,
          dataset,
          dataStreams,
          counts: { [dataset]: 42 },
          agents,
          now,
        })
      ).toEqual({ kind: 'receiving', count: 42, lastSeenMs: now - 1000 });
      expect(
        getDetectStatus({
          stream: access,
          dataset,
          dataStreams,
          agents: { ...agents, inputErrors: { [access.inputKey]: 'host-1: permission denied' } },
          now,
        })
      ).toEqual({ kind: 'error', message: 'host-1: permission denied' });
    });

    it('maps unhealthy agent input units to wizard inputs', () => {
      const policy = {
        id: 'pp-1',
        inputs: [
          {
            id: 'in-logs',
            type: 'otelcol',
            name: 'filelog_otel',
            policy_template: 'nginx',
            enabled: true,
            streams: [],
          },
          {
            id: 'in-metrics',
            type: 'otelcol',
            name: 'nginx_otel_input',
            policy_template: 'nginx',
            enabled: true,
            streams: [],
          },
        ],
      } as any;
      const agent = {
        id: 'agent-1',
        local_metadata: { host: { hostname: 'web-1' } },
        components: [
          {
            id: 'otelcol-default',
            type: 'otelcol',
            status: 'DEGRADED',
            message: '',
            units: [
              {
                id: 'otelcol-default-in-logs',
                type: 'input',
                status: 'FAILED',
                message: 'open /var/log/nginx/access.log: permission denied',
              },
              { id: 'otelcol-default-in-metrics', type: 'input', status: 'HEALTHY', message: 'ok' },
            ],
          },
        ],
      } as any;
      expect(getAgentInputErrors([agent], policy)).toEqual({
        'nginx-filelog_otel': 'web-1: open /var/log/nginx/access.log: permission denied',
      });
    });
  });

  describe('applySchemaState + stock validation', () => {
    it('writes enabled streams and edited values onto the stock package policy', () => {
      const model = buildSchemaModel(nginxPackageInfo);
      const error = streamBy(model, 'nginx.error');
      const access = streamBy(model, 'nginx.access');
      const state: SchemaState = {
        ...emptySchemaState(),
        enabled: { [error.id]: false },
        values: {
          [streamVarPath(access.id, 'paths')]: ['/srv/nginx/access.log'],
          [inputVarPath('nginx-nginx/metrics', 'hosts')]: ['http://10.0.0.1:8080'],
        },
      };
      const policy = policyFor(nginxPackageInfo, model, state);
      const logfile = policy.inputs.find((i) => i.type === 'logfile')!;
      expect(logfile.enabled).toBe(true);
      expect(logfile.streams.map((s) => [s.data_stream.dataset, s.enabled])).toEqual([
        ['nginx.access', true],
        ['nginx.error', false],
      ]);
      expect(logfile.streams[0].vars!.paths.value).toEqual(['/srv/nginx/access.log']);
      const metrics = policy.inputs.find((i) => i.type === 'nginx/metrics')!;
      expect(metrics.vars!.hosts.value).toEqual(['http://10.0.0.1:8080']);
      // Idempotent: nothing left to apply
      expect(applySchemaState(policy, model, state)).toBeUndefined();
      // Policy-level fields live above the schema state
      expect(applySchemaState(policy, model, state, { name: 'web-1', namespace: 'prod' })).toEqual({
        name: 'web-1',
        namespace: 'prod',
      });
    });

    it('maps stock validation errors back to wizard vars', () => {
      const model = buildSchemaModel(nginxOtelPackageInfo);
      const access = streamBy(model, 'nginx.access');
      const state = {
        ...emptySchemaState(),
        values: { [streamVarPath(access.id, 'include')]: [] },
      };
      const policy = policyFor(nginxOtelPackageInfo, model, state);
      const results = validatePackagePolicy(policy, nginxOtelPackageInfo, deps);
      const include = access.vars.find((v) => v.name === 'include')!;
      expect(getVarErrors(results, model, toStreamVar(access, include))).toEqual([
        'Access log paths is required',
      ]);
      const startAt = access.vars.find((v) => v.name === 'start_at')!;
      expect(getVarErrors(results, model, toStreamVar(access, startAt))).toBeNull();
    });

    it('maps input-level errors (ECS hosts)', () => {
      const model = buildSchemaModel(nginxPackageInfo);
      const input = model.inputs.find((i) => i.type === 'nginx/metrics')!;
      const state = { ...emptySchemaState(), values: { [inputVarPath(input.key, 'hosts')]: [] } };
      const policy = policyFor(nginxPackageInfo, model, state);
      const results = validatePackagePolicy(policy, nginxPackageInfo, deps);
      const hosts = input.vars.find((v) => v.name === 'hosts')!;
      expect(getVarErrors(results, model, toInputVar(input, hosts))).toEqual(['Hosts is required']);
    });
  });

  describe('schema switch carry-over (Nginx)', () => {
    const ecs = buildSchemaModel(nginxPackageInfo);
    const otel = buildSchemaModel(nginxOtelPackageInfo);

    it('pairs streams by dataset, then by signal', () => {
      const pairs = pairStreams(ecs, otel);
      expect(
        [...pairs.entries()].map(([from, to]) => [
          ecs.streams.find((s) => s.id === from)!.dataset,
          to.map((id) => otel.streams.find((s) => s.id === id)!.dataset),
        ])
      ).toEqual([
        ['nginx.access', ['nginx.access']],
        ['nginx.error', ['nginx.error']],
        ['nginx.stubstatus', ['nginxreceiver']],
      ]);
    });

    it('keeps stream selection, drops values whose var names differ', () => {
      const access = streamBy(ecs, 'nginx.access');
      const error = streamBy(ecs, 'nginx.error');
      const stub = streamBy(ecs, 'nginx.stubstatus');
      const from: SchemaState = {
        ...emptySchemaState(),
        enabled: { [error.id]: false, [stub.id]: false },
        values: {
          [streamVarPath(access.id, 'paths')]: ['/srv/nginx/access.log'],
          [streamVarPath(access.id, 'ignore_older')]: '24h',
          [inputVarPath('nginx-nginx/metrics', 'hosts')]: ['http://10.0.0.1:8080'],
          [streamVarPath(stub.id, 'server_status_path')]: '/status',
          [streamVarPath(stub.id, 'period')]: '30s',
        },
      };
      const { state, report } = carryOverSchemaState({ model: ecs, state: from }, { model: otel });
      expect(otel.streams.map((s) => [s.dataset, state.enabled[s.id]])).toEqual([
        ['nginxreceiver', false],
        ['nginx.access', true],
        ['nginx.error', false],
      ]);
      expect(state.values).toEqual({});
      expect(report.kept).toEqual([]);
      expect(report.dropped.map((d) => d.title)).toEqual([
        'Paths',
        'Ignore events older than',
        'Hosts',
        'Server Status Path',
        'Period',
      ]);
      expect(getSteps(otel, state)).toEqual(['collect', 'logs', 'review', 'detect']);
    });

    it('keeps values when name and type match, and keeps target edits on switch back', () => {
      // Same package on both sides with the metrics dataset renamed: stream pairs by signal,
      // vars pair by name.
      const renamed = cloneDeep(nginxPackageInfo);
      renamed.data_streams!.find((ds) => ds.dataset === 'nginx.stubstatus')!.dataset =
        'nginx.status';
      const other = buildSchemaModel(renamed);
      const stub = streamBy(ecs, 'nginx.stubstatus');
      const status = streamBy(other, 'nginx.status');
      const previous: SchemaState = {
        ...emptySchemaState(),
        values: { [streamVarPath(status.id, 'tags')]: ['kept'] },
      };
      const { state, report } = carryOverSchemaState(
        {
          model: ecs,
          state: {
            ...emptySchemaState(),
            values: {
              [streamVarPath(stub.id, 'period')]: '30s',
              [inputVarPath('nginx-nginx/metrics', 'hosts')]: ['http://10.0.0.1'],
            },
          },
        },
        { model: other, state: previous }
      );
      expect(state.values).toEqual({
        [streamVarPath(status.id, 'period')]: '30s',
        [streamVarPath(status.id, 'tags')]: ['kept'],
        [inputVarPath('nginx-nginx/metrics', 'hosts')]: ['http://10.0.0.1'],
      });
      expect(report.dropped).toEqual([]);
    });
  });

  describe('Apache (second group, no Kibana changes)', () => {
    const ecs = buildSchemaModel(apachePackageInfo);
    const otel = buildSchemaModel(apacheInputOtelPackageInfo);

    it('reads the ECS child like Nginx', () => {
      expect(ecs.signals).toEqual(['logs', 'metrics']);
      expect(ecs.streams.map((s) => getTargetDataStreamPattern(s))).toEqual([
        'logs-apache.access-*',
        'logs-apache.error-*',
        'metrics-apache.status-*',
      ]);
      const metricsInput = ecs.inputs.find((i) => i.type === 'apache/metrics')!;
      expect(metricsInput.vars.filter((v) => !isAdvancedVar(v)).map((v) => v.name)).toEqual([
        'hosts',
      ]);
    });

    it('reads the OTel input package child: one metrics stream, template vars, dataset var', () => {
      expect(otel.packageType).toBe('input');
      expect(otel.signals).toEqual(['metrics']);
      expect(otel.inputs.map((i) => [i.key, i.validationKey])).toEqual([
        ['apachereceiver-otelcol', 'otelcol'],
      ]);
      const [stream] = otel.streams;
      expect(stream.dataset).toBe('apache_input_otel.apachereceiver');
      expect(stream.isOtel).toBe(true);
      expect(visibleVars(stream)).toEqual(['endpoint', 'tls_enabled', 'data_stream.dataset']);
      // Input packages write to the dataset var value (default: policy template name).
      const policy = policyFor(apacheInputOtelPackageInfo, otel, emptySchemaState());
      expect(getDatasetVarValue(policy, otel, stream)).toBe('apachereceiver');
      expect(getTargetDataStreamPattern(stream, getDatasetVarValue(policy, otel, stream))).toBe(
        'metrics-apachereceiver.otel-*'
      );
    });

    it('applies state and validates the input package policy shape', () => {
      const [stream] = otel.streams;
      const state = {
        ...emptySchemaState(),
        // The stock text field stores an emptied field as undefined.
        values: { [streamVarPath(stream.id, 'endpoint')]: undefined },
      };
      const policy = policyFor(apacheInputOtelPackageInfo, otel, state);
      expect(policy.inputs).toHaveLength(1);
      expect(policy.inputs[0].type).toBe('otelcol');
      expect(policy.inputs[0].streams[0].vars!.endpoint.value).toBeUndefined();
      const results = validatePackagePolicy(policy, apacheInputOtelPackageInfo, deps);
      const endpoint = stream.vars.find((v) => v.name === 'endpoint')!;
      expect(getVarErrors(results, otel, toStreamVar(stream, endpoint))).toEqual([
        'Endpoint is required',
      ]);
    });

    it('switching to OTel loses logs; switching back restores them', () => {
      const access = streamBy(ecs, 'apache.access');
      const status = streamBy(ecs, 'apache.status');
      const fromEcs: SchemaState = {
        ...emptySchemaState(),
        enabled: { [access.id]: false },
        values: { [streamVarPath(status.id, 'period')]: '1m' },
      };
      const toOtel = carryOverSchemaState({ model: ecs, state: fromEcs }, { model: otel });
      expect(getSteps(otel, toOtel.state)).toEqual(['collect', 'metrics', 'review', 'detect']);
      expect(toOtel.report.dropped.map((d) => d.title)).toEqual(['Period']);

      const back = carryOverSchemaState(
        { model: otel, state: toOtel.state },
        { model: ecs, state: fromEcs }
      );
      // Logs aren't in OTel, so ECS keeps its own logs selection; metrics follows the pair.
      expect(ecs.streams.map((s) => [s.dataset, back.state.enabled[s.id]])).toEqual([
        ['apache.access', false],
        ['apache.error', undefined],
        ['apache.status', true],
      ]);
      expect(back.state.values).toEqual(fromEcs.values);
    });
  });
});
