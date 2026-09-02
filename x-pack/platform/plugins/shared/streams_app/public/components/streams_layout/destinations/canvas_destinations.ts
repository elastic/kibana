/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyAssets, type Streams } from '@kbn/streams-schema';
import { i18n } from '@kbn/i18n';
import { initialNodes } from '../../stream_list_view/canvas/seed-graph';
import type { DestinationNodeData } from '../../stream_list_view/canvas/types';
import { lifecycleToRetentionMs } from '../../../util/lifecycle_to_retention_ms';
import { getDestinationMockMetadata } from './destination_mock_metadata';
import type { Destination } from './types';

const MOCK_UPDATED_AT = '2026-01-01T00:00:00.000Z';

const FULL_PRIVILEGES: Streams.ClassicStream.GetResponse['privileges'] = {
  manage: true,
  monitor: true,
  lifecycle: true,
  simulate: true,
  text_structure: true,
  read_failure_store: true,
  manage_failure_store: true,
  view_index_metadata: true,
  create_snapshot_repository: true,
};

const CANVAS_DESTINATION_DESCRIPTIONS: Record<string, string> = {
  'logs-nginx-default': i18n.translate(
    'xpack.streams.canvasDestinations.logsNginxDefaultDescription',
    { defaultMessage: 'Nginx logs ingested via the bulk source.' }
  ),
  'logs.otel': i18n.translate('xpack.streams.canvasDestinations.logsOtelDescription', {
    defaultMessage: 'OpenTelemetry logs from the managed OTLP endpoint.',
  }),
  'logs.otel.prod': i18n.translate('xpack.streams.canvasDestinations.logsOtelProdDescription', {
    defaultMessage: 'Production OpenTelemetry logs.',
  }),
  'logs.otel.dev': i18n.translate('xpack.streams.canvasDestinations.logsOtelDevDescription', {
    defaultMessage: 'Development OpenTelemetry logs.',
  }),
  'logs-security.audit': i18n.translate(
    'xpack.streams.canvasDestinations.logsSecurityAuditDescription',
    { defaultMessage: 'Security audit logs after PII redaction.' }
  ),
  'logs-aws.cloudwatch': i18n.translate(
    'xpack.streams.canvasDestinations.logsAwsCloudwatchDescription',
    { defaultMessage: 'CloudWatch logs ingested via Firehose.' }
  ),
  'logs-cloudwatch.alerts': i18n.translate(
    'xpack.streams.canvasDestinations.logsCloudwatchAlertsDescription',
    { defaultMessage: 'CloudWatch error and alert logs.' }
  ),
  'logs-k8s.container': i18n.translate(
    'xpack.streams.canvasDestinations.logsK8sContainerDescription',
    { defaultMessage: 'Kubernetes container logs.' }
  ),
  'metrics-k8s.pod': i18n.translate('xpack.streams.canvasDestinations.metricsK8sPodDescription', {
    defaultMessage: 'Kubernetes pod metrics extracted from container logs.',
  }),
  'logs-archive.cold': i18n.translate(
    'xpack.streams.canvasDestinations.logsArchiveColdDescription',
    { defaultMessage: 'Cold storage archive in Amazon S3.' }
  ),
  'logs-nginx.access': i18n.translate(
    'xpack.streams.canvasDestinations.logsNginxAccessDescription',
    { defaultMessage: 'NGINX access logs.' }
  ),
  'logs-nginx.bots': i18n.translate('xpack.streams.canvasDestinations.logsNginxBotsDescription', {
    defaultMessage: 'NGINX traffic tagged as bots.',
  }),
};

const mockClassicDefinition = (
  name: string,
  description: string,
  retention: string
): Streams.ClassicStream.Definition => ({
  type: 'classic',
  name,
  description,
  updated_at: MOCK_UPDATED_AT,
  ingest: {
    lifecycle: { dsl: { data_retention: retention } },
    processing: { steps: [], updated_at: MOCK_UPDATED_AT },
    settings: {},
    failure_store: { inherit: {} },
    classic: {},
  },
});

const canvasNodeToDestination = (data: DestinationNodeData): Destination => {
  const isExternal = data.storage === 'external';
  const description =
    CANVAS_DESTINATION_DESCRIPTIONS[data.title] ??
    data.meta ??
    i18n.translate('xpack.streams.canvasDestinations.fallbackDescription', {
      defaultMessage: 'Canvas destination.',
    });
  const retention = isExternal ? '365d' : '30d';
  const lifecycle = { dsl: { data_retention: retention } };
  const meta = getDestinationMockMetadata(data.title);

  return {
    name: data.title,
    type: isExternal ? 's3' : 'elasticsearch',
    description,
    tags: isExternal ? ['archive', 'cold-storage'] : meta.tags,
    isManaged: meta.isManaged,
    isInternal: isExternal ? false : meta.isInternal,
    hasDataStream: false,
    canReadFailureStore: !isExternal,
    retention: lifecycle,
    retentionMs: lifecycleToRetentionMs(lifecycle),
    streamDefinition: mockClassicDefinition(data.title, description, retention),
    indexMode: 'standard',
  };
};

const getConfiguredCanvasDestinationData = (): DestinationNodeData[] =>
  initialNodes
    .filter((node) => node.type === 'destination')
    .map((node) => node.data as DestinationNodeData)
    .filter((data) => data.mode === 'configured' && Boolean(data.title));

/** Destinations seeded on the canvas, as Destinations-table rows. */
export const getCanvasSeedDestinations = (): Destination[] =>
  getConfiguredCanvasDestinationData().map(canvasNodeToDestination);

export const isCanvasSeedDestinationName = (name: string): boolean =>
  getConfiguredCanvasDestinationData().some((data) => data.title === name);

/**
 * Prototype fallback so canvas destinations that do not exist as streams still
 * open a destination detail page instead of the not-found prompt.
 */
export const getMockDestinationGetResponse = (
  name: string
): Streams.ClassicStream.GetResponse | undefined => {
  const destination = getCanvasSeedDestinations().find((item) => item.name === name);
  if (!destination) {
    return undefined;
  }

  return {
    stream: destination.streamDefinition,
    privileges: FULL_PRIVILEGES,
    data_stream_exists: true,
    effective_lifecycle: destination.retention ?? { dsl: {} },
    effective_failure_store: { lifecycle: { disabled: {} } },
    effective_settings: {},
    ...emptyAssets,
  };
};

/** Live classic streams win when a canvas destination shares the same name. */
export const mergeLiveAndCanvasDestinations = (live: Destination[]): Destination[] => {
  const liveNames = new Set(live.map((destination) => destination.name));
  return [
    ...live,
    ...getCanvasSeedDestinations().filter((destination) => !liveNames.has(destination.name)),
  ];
};

export const createPrototypeDestination = ({
  name,
  isInternal,
}: {
  name: string;
  isInternal: boolean;
}): Destination => {
  const isExternal = !isInternal;
  const description = i18n.translate('xpack.streams.canvasDestinations.addedDestinationDescription', {
    defaultMessage: 'Newly added destination.',
  });
  const retention = isExternal ? '365d' : '30d';
  const lifecycle = { dsl: { data_retention: retention } };
  const meta = getDestinationMockMetadata(name);

  return {
    name,
    type: isExternal ? 's3' : 'elasticsearch',
    description,
    tags: isExternal ? ['archive'] : meta.tags,
    isManaged: false,
    isInternal,
    hasDataStream: false,
    canReadFailureStore: isInternal,
    retention: lifecycle,
    retentionMs: lifecycleToRetentionMs(lifecycle),
    streamDefinition: mockClassicDefinition(name, description, retention),
    indexMode: 'standard',
  };
};
