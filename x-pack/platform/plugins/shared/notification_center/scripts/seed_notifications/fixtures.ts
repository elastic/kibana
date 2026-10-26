/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  buildStateNotificationId,
  buildTimeseriesNotificationId,
} from '../../common/notification_id';
import {
  notificationReadSchema,
  notificationWriteSchema,
  SEVERITY,
  SEVERITIES,
} from '../../common/notification_schema';
import {
  isRegisteredNotificationRef,
  NOTIFICATION_TYPES,
} from '../../common/notification_registry_utils';
import type { Cta, Notification, Severity } from '../../common/types';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

const INFERENCE_ENDPOINTS_CTA: Cta = {
  link: '/app/management/data/inference_endpoints',
  linkText: 'Manage inference endpoints',
};

interface StateFixture {
  entity: string;
  state: string;
  title: string;
  description: string;
  severity: Severity;
  age: number;
  cta?: Cta;
}

const modelStatus = (fixture: StateFixture): Notification => {
  const { namespace, type } = NOTIFICATION_TYPES.inference.modelStatus;
  const { entity, state, title, description, severity, age, cta } = fixture;
  return {
    '@timestamp': ago(age),
    notification_id: buildStateNotificationId({ namespace, type, entity, state }),
    namespace,
    type,
    title,
    description,
    severity,
    ...(cta && { cta }),
  };
};

/**
 * The `(inference, modelStatus)` pair is the only one in `NOTIFICATION_REGISTRY` today, so
 * variety here comes from severity, age and content shape rather than from distinct types.
 */
const REGISTERED_FIXTURES: Notification[] = [
  modelStatus({
    entity: 'elser-v2',
    state: 'deprecated',
    title: 'ELSER v2 is deprecated',
    description:
      'The elser-v2 endpoint is deprecated and will stop accepting requests in a future release. Migrate to elser-v3.',
    severity: SEVERITY.warning,
    age: 2 * DAY,
    cta: INFERENCE_ENDPOINTS_CTA,
  }),
  // A second, older copy of the id above: the list route collapses on `notification_id` and
  // returns only this group's newest copy, so the seed should contain a group with history.
  modelStatus({
    entity: 'elser-v2',
    state: 'deprecated',
    title: 'ELSER v2 is deprecated (earlier copy)',
    description: 'Superseded copy — visible only in the raw data stream, never in the list route.',
    severity: SEVERITY.info,
    age: 9 * DAY,
  }),
  modelStatus({
    entity: 'e5-small-multilingual',
    state: 'eol',
    title: 'e5-small-multilingual has reached end of life',
    description:
      'This endpoint no longer serves inference requests. Recreate it against a supported model to restore semantic search.',
    severity: SEVERITY.critical,
    age: 6 * HOUR,
    cta: INFERENCE_ENDPOINTS_CTA,
  }),
  modelStatus({
    entity: 'rerank-v1',
    state: 'preview',
    title: 'Reranking is available in preview',
    description: 'The rerank-v1 endpoint is in technical preview and is not covered by the SLA.',
    severity: SEVERITY.info,
    age: 3 * DAY,
  }),
  modelStatus({
    entity: 'my-openai-gpt4',
    state: 'deprecated',
    title: 'my-openai-gpt4 points at a deprecated provider model',
    description:
      'The upstream provider has deprecated the model behind this endpoint. Requests keep succeeding until the provider removes it.',
    severity: SEVERITY.error,
    age: 20 * DAY,
    cta: INFERENCE_ENDPOINTS_CTA,
  }),
  // Deliberately long, to exercise truncation and wrapping in the bell flyout.
  modelStatus({
    entity: 'multilingual-e5-large-with-a-deliberately-long-endpoint-identifier',
    state: 'deprecated',
    title:
      'multilingual-e5-large-with-a-deliberately-long-endpoint-identifier is deprecated and scheduled for removal',
    description:
      'This endpoint is deprecated. It remains available for now, but every deployment that references it should be migrated before the next minor release, because the removal is not gated on usage. Affected features include semantic_text fields, the inference processor in ingest pipelines, and any retriever that names this endpoint directly. Re-indexing is required after the migration.',
    severity: SEVERITY.warning,
    age: 45 * DAY,
  }),
];

/**
 * Types no plugin has registered yet. `notificationWriteSchema` rejects these, so no producer
 * can currently create them — they are seeded raw to exercise the read path and the UI against
 * a mixed-namespace feed, and against a `timeseries` id, which the registry has no example of.
 */
const UNREGISTERED_FIXTURES: Notification[] = [
  {
    '@timestamp': ago(12 * HOUR),
    notification_id: buildStateNotificationId({
      namespace: 'cloud',
      type: 'maintenance',
      entity: 'aws-us-east-1',
      state: 'scheduled',
    }),
    namespace: 'cloud',
    type: 'maintenance',
    title: 'Scheduled maintenance for aws-us-east-1',
    description:
      'Your deployment will be upgraded during the next maintenance window. Expect a brief failover.',
    severity: SEVERITY.info,
  },
  {
    '@timestamp': ago(30 * MINUTE),
    notification_id: buildStateNotificationId({
      namespace: 'alerting',
      type: 'ruleStatus',
      entity: 'rule-4f2a',
      state: 'failing',
    }),
    namespace: 'alerting',
    type: 'ruleStatus',
    title: 'Rule "Disk usage above 90%" is failing',
    description: 'The rule has failed its last 5 executions with a search phase execution error.',
    severity: SEVERITY.error,
    cta: {
      link: '/app/management/insightsAndAlerting/triggersActions/rules',
      linkText: 'View rule',
    },
  },
  {
    '@timestamp': ago(5 * MINUTE),
    notification_id: buildStateNotificationId({
      namespace: 'reporting',
      type: 'reportStatus',
      entity: 'report-9c31',
      state: 'completed',
    }),
    namespace: 'reporting',
    type: 'reportStatus',
    title: 'Your PDF report is ready',
    description: '"Weekly search relevance" finished generating and is available for download.',
    severity: SEVERITY.info,
    cta: { link: '/app/management/insightsAndAlerting/reporting', linkText: 'Download report' },
  },
  {
    '@timestamp': ago(45 * MINUTE),
    notification_id: buildTimeseriesNotificationId({
      namespace: 'alerting',
      type: 'ruleTriggered',
      event: 'diskUsage',
      epochMs: Date.now() - 45 * MINUTE,
    }),
    event_timestamp: ago(45 * MINUTE),
    namespace: 'alerting',
    type: 'ruleTriggered',
    title: 'Disk usage above 90% on node-2',
    description:
      'A timeseries notification: every occurrence carries its own id, so these never collapse into one another.',
    severity: SEVERITY.critical,
  },
];

export interface ChunkOptions {
  includeUnregistered: boolean;
}

/** The one-shot seed: a spread of severities, ages, content shapes and id kinds. */
export const buildChunk = ({ includeUnregistered }: ChunkOptions): Notification[] => [
  ...REGISTERED_FIXTURES,
  ...(includeUnregistered ? UNREGISTERED_FIXTURES : []),
];

/**
 * One notification for a cadence tick. Every third tick re-pushes an id already in the chunk
 * instead of minting a new one, so collapse and the unread-on-re-push behaviour stay visible.
 */
export const buildTick = (tick: number): Notification => {
  const severity = SEVERITIES[tick % SEVERITIES.length];

  if (tick % 3 === 2) {
    const { notification_id: id, namespace, type } = REGISTERED_FIXTURES[0];
    return {
      '@timestamp': new Date().toISOString(),
      notification_id: id,
      namespace,
      type,
      title: `ELSER v2 is deprecated (re-pushed, tick ${tick})`,
      description:
        'Same notification_id as an existing group — collapses into it as the newest copy.',
      severity,
    };
  }

  return modelStatus({
    entity: `streamed-endpoint-${tick}`,
    state: 'deprecated',
    title: `Streamed notification ${tick}`,
    description: `Emitted by the seed script's cadence mode at ${new Date().toISOString()}.`,
    severity,
    age: 0,
  });
};

/**
 * Reject a fixture that no producer could have written. Registered pairs must satisfy the
 * producer contract; everything must at least survive the read path's parse.
 */
export const validateFixture = (notification: Notification): void => {
  if (isRegisteredNotificationRef(notification.namespace, notification.type)) {
    const parsed = notificationWriteSchema.safeParse(omit(notification, '@timestamp'));
    if (!parsed.success) {
      throw new Error(
        `Fixture "${notification.notification_id}" is invalid: ${parsed.error.message}`
      );
    }
  }

  const readable = notificationReadSchema.safeParse(notification);
  if (!readable.success) {
    throw new Error(
      `Fixture "${notification.notification_id}" would be dropped by the list route: ${readable.error.message}`
    );
  }
};
