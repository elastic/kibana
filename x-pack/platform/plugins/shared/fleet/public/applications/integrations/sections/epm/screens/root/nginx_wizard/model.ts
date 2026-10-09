/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: hard-coded model for the Nginx onboarding wizard. The wizard keeps schema-neutral
// values and maps them onto the selected child package's policy: ECS `nginx` or OTel
// `nginx_otel_integ`. Generalizing this across integrations is follow-up work.

import type { NewPackagePolicyInput, PackagePolicyConfigRecord } from '../../../../../../../types';

export type NginxSchema = 'otel' | 'ecs';
export type NginxSignal = 'logs' | 'metrics';
export type NginxStreamId = 'access' | 'error' | 'metrics';
export type NginxStep = 'schema' | 'logs' | 'metrics' | 'summary';

export const NGINX_ROOT_NAME = 'nginx_group';

export const SCHEMA_INFO: Record<NginxSchema, { title: string; description: string }> = {
  otel: { title: 'OpenTelemetry', description: 'OpenTelemetry semantic conventions.' },
  ecs: { title: 'ECS', description: 'Elastic Common Schema - best for compatibility.' },
};

export const SIGNAL_INFO: Record<
  NginxSignal,
  { title: string; description: string; streams: NginxStreamId[] }
> = {
  logs: {
    title: 'Logs',
    description:
      'Event records of what happened - errors, audits, and activity you can search and analyze.',
    streams: ['access', 'error'],
  },
  metrics: {
    title: 'Metrics',
    description: 'Numeric measurements over time - connections, requests, and saturation.',
    streams: ['metrics'],
  },
};

export const STREAM_INFO: Record<
  NginxStreamId,
  { title: string; shortTitle: string; description: string }
> = {
  access: {
    title: 'Nginx access logs',
    shortTitle: 'Access logs',
    description: 'Collect Nginx access logs.',
  },
  error: {
    title: 'Nginx error logs',
    shortTitle: 'Error logs',
    description: 'Collect Nginx error logs.',
  },
  metrics: {
    title: 'Nginx stub status metrics',
    shortTitle: 'Stub status',
    description: 'Collect Nginx stub_status connection and request metrics.',
  },
};

// Dataset of each stream in each child package's policy.
const STREAM_DATASET: Record<NginxSchema, Record<NginxStreamId, string>> = {
  ecs: { access: 'nginx.access', error: 'nginx.error', metrics: 'nginx.stubstatus' },
  otel: { access: 'nginx.access', error: 'nginx.error', metrics: 'nginxreceiver' },
};

// Dataset of the data stream that receives documents (OTel templates carry a `.otel` suffix).
export const getTargetDataset = (schema: NginxSchema, stream: NginxStreamId) =>
  schema === 'otel' ? `${STREAM_DATASET.otel[stream]}.otel` : STREAM_DATASET.ecs[stream];

export const STREAM_TYPE: Record<NginxStreamId, 'logs' | 'metrics'> = {
  access: 'logs',
  error: 'logs',
  metrics: 'metrics',
};

export interface NginxValues {
  accessPaths: string[];
  errorPaths: string[];
  accessIgnoreOlder: string;
  errorIgnoreOlder: string;
  /** OTel only (filelog start_at) */
  readFrom: 'end' | 'beginning';
  /** ECS only */
  accessTags: string[];
  errorTags: string[];
  metricsTags: string[];
  preserveOriginalEvent: boolean;
  /** Metrics: shared host + status path. ECS = hosts + server_status_path, OTel = endpoint. */
  host: string;
  statusPath: string;
  period: string;
}

export const DEFAULT_VALUES: Record<NginxSchema, NginxValues> = {
  ecs: {
    accessPaths: ['/var/log/nginx/access.log*'],
    errorPaths: ['/var/log/nginx/error.log*'],
    accessIgnoreOlder: '72h',
    errorIgnoreOlder: '72h',
    readFrom: 'end',
    accessTags: ['nginx-access'],
    errorTags: ['nginx-error'],
    metricsTags: ['nginx-stubstatus'],
    preserveOriginalEvent: false,
    host: 'http://127.0.0.1:80',
    statusPath: '/nginx_status',
    period: '10s',
  },
  otel: {
    accessPaths: ['/var/log/nginx/access.log'],
    errorPaths: ['/var/log/nginx/error.log'],
    accessIgnoreOlder: '',
    errorIgnoreOlder: '',
    readFrom: 'end',
    accessTags: [],
    errorTags: [],
    metricsTags: [],
    preserveOriginalEvent: false,
    host: 'http://localhost:80',
    statusPath: '/nginx_status',
    period: '10s',
  },
};

/** Only fields the user edited. Anything else falls back to the schema's package defaults. */
export type NginxOverrides = Partial<NginxValues>;

export const resolveValues = (schema: NginxSchema, overrides: NginxOverrides): NginxValues => ({
  ...DEFAULT_VALUES[schema],
  ...overrides,
});

const streamVarValues = (
  schema: NginxSchema,
  stream: NginxStreamId,
  v: NginxValues
): Record<string, unknown> => {
  if (schema === 'ecs') {
    switch (stream) {
      case 'access':
        return {
          paths: v.accessPaths,
          ignore_older: v.accessIgnoreOlder,
          tags: v.accessTags,
          preserve_original_event: v.preserveOriginalEvent,
        };
      case 'error':
        return {
          paths: v.errorPaths,
          ignore_older: v.errorIgnoreOlder,
          tags: v.errorTags,
          preserve_original_event: v.preserveOriginalEvent,
        };
      case 'metrics':
        return { period: v.period, server_status_path: v.statusPath, tags: v.metricsTags };
    }
  }
  switch (stream) {
    case 'access':
      return {
        include: v.accessPaths,
        exclude_older_than: v.accessIgnoreOlder || undefined,
        start_at: v.readFrom,
      };
    case 'error':
      return {
        include: v.errorPaths,
        exclude_older_than: v.errorIgnoreOlder || undefined,
        start_at: v.readFrom,
      };
    case 'metrics':
      return {
        endpoint: `${v.host.replace(/\/+$/, '')}${v.statusPath}`,
        collection_interval: v.period,
      };
  }
};

const setVars = (
  vars: PackagePolicyConfigRecord | undefined,
  values: Record<string, unknown>
): PackagePolicyConfigRecord | undefined => {
  if (!vars) return vars;
  const next = { ...vars };
  Object.entries(values).forEach(([name, value]) => {
    if (next[name]) next[name] = { ...next[name], value };
  });
  return next;
};

/** Applies wizard state to the child package policy inputs. */
export const applyToInputs = (
  inputs: NewPackagePolicyInput[],
  schema: NginxSchema,
  enabledStreams: Record<NginxStreamId, boolean>,
  values: NginxValues
): NewPackagePolicyInput[] =>
  inputs.map((input) => {
    const streams = input.streams.map((stream) => {
      const id = (Object.keys(STREAM_DATASET[schema]) as NginxStreamId[]).find(
        (s) => STREAM_DATASET[schema][s] === stream.data_stream.dataset
      );
      if (!id) return stream;
      return {
        ...stream,
        enabled: enabledStreams[id],
        vars: setVars(stream.vars, streamVarValues(schema, id, values)),
      };
    });
    const vars =
      schema === 'ecs' && input.type === 'nginx/metrics'
        ? setVars(input.vars, { hosts: [values.host] })
        : input.vars;
    return { ...input, enabled: streams.some((s) => s.enabled), streams, vars };
  });

export const getSteps = (enabledStreams: Record<NginxStreamId, boolean>): NginxStep[] => [
  'schema',
  ...(enabledStreams.access || enabledStreams.error ? (['logs'] as const) : []),
  ...(enabledStreams.metrics ? (['metrics'] as const) : []),
  'summary',
];

export const STEP_LABELS: Record<NginxStep, string> = {
  schema: 'Schema & signals',
  logs: 'Logs',
  metrics: 'Metrics',
  summary: 'Summary',
};
