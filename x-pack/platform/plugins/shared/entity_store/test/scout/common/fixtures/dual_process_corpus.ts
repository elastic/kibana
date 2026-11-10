/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fixed corpus for the dual-process union equivalence test. Every doc sits inside
 * `DUAL_PROCESS_WINDOW`, far older than the scheduled tasks' lookback, so only forced runs
 * read it. The comment on each doc names the process its `event.kind` routes it to.
 */
export const DUAL_PROCESS_WINDOW = {
  fromDateISO: '2026-02-10T11:00:00.000Z',
  toDateISO: '2026-02-10T13:00:00.000Z',
} as const;

/** Separate window for the run-order case, see `runOrderCorpus`. */
export const RUN_ORDER_WINDOW = {
  fromDateISO: '2026-02-10T17:00:00.000Z',
  toDateISO: '2026-02-10T19:00:00.000Z',
} as const;

/** Separate window for the sampling case, so its 1000 docs never reach the equivalence runs. */
export const SAMPLING_WINDOW = {
  fromDateISO: '2026-02-10T14:00:00.000Z',
  toDateISO: '2026-02-10T16:00:00.000Z',
} as const;

const at = (minute: number) => `2026-02-10T12:${String(minute).padStart(2, '0')}:00.000Z`;

export const dualProcessCorpus: Array<Record<string, unknown>> = [
  // Okta asset only. Priority.
  {
    '@timestamp': at(1),
    event: { kind: 'asset', module: 'okta' },
    user: { id: 'dp-okta-asset-only', name: 'Okta Asset Only', email: 'okta.only@example.com' },
  },

  // Entra ID asset only. Priority.
  {
    '@timestamp': at(2),
    event: { kind: 'asset', module: 'entityanalytics_entra_id' },
    user: { id: 'dp-entra-asset-only', name: 'Entra Asset Only' },
  },

  // Active Directory asset, then an IAM lifecycle event for the same user. Asset: priority.
  // IAM: non-priority, enriches the entity the asset created.
  {
    '@timestamp': at(3),
    event: { kind: 'asset', module: 'entityanalytics_ad' },
    user: { id: 'dp-ad-asset-plus-iam', name: 'AD Asset Plus IAM' },
  },
  {
    '@timestamp': at(4),
    event: { category: 'iam', type: 'creation', module: 'entityanalytics_ad' },
    user: { id: 'dp-ad-asset-plus-iam', name: 'AD Asset Plus IAM' },
  },

  // IAM lifecycle event with no asset doc. Non-priority. Creates no entity in any mode.
  {
    '@timestamp': at(5),
    event: { category: 'iam', type: 'creation', module: 'entityanalytics_ad' },
    user: { id: 'dp-ad-iam-only', name: 'AD IAM Only' },
  },

  // Okta asset, then activity for the same user. Asset: priority. Activity: non-priority, only
  // kept through the LOOKUP on the entity priority wrote.
  {
    '@timestamp': at(6),
    event: { kind: 'asset', module: 'okta' },
    user: { id: 'dp-okta-asset-then-activity', name: 'Okta Asset Then Activity' },
  },
  {
    '@timestamp': at(7),
    event: { kind: 'event', category: 'authentication', type: 'start', module: 'okta' },
    user: { id: 'dp-okta-asset-then-activity', name: 'Okta Asset Then Activity' },
  },

  // Multi-valued event.kind containing asset. Priority, through MV_CONTAINS.
  {
    '@timestamp': at(9),
    event: { kind: ['asset', 'event'], module: 'okta' },
    user: { id: 'dp-okta-multi-kind', name: 'Okta Multi Kind' },
  },

  // Local users. event.kind missing, null, "event" and "Asset" (the gate is case-sensitive).
  // All non-priority.
  {
    '@timestamp': at(10),
    event: { category: 'authentication', type: 'start' },
    user: { name: 'dp-local-kind-missing' },
    host: { id: 'dp-host-1', name: 'dp-host-1.example.com' },
  },
  {
    '@timestamp': at(11),
    event: { kind: null, category: 'authentication', type: 'start' },
    user: { name: 'dp-local-kind-null' },
    host: { id: 'dp-host-1', name: 'dp-host-1.example.com' },
  },
  {
    '@timestamp': at(12),
    event: { kind: 'event', category: 'authentication', type: 'start' },
    user: { name: 'dp-local-kind-event' },
    host: { id: 'dp-host-2', name: 'dp-host-2.example.com' },
  },
  {
    '@timestamp': at(13),
    event: { kind: 'Asset', category: 'authentication', type: 'start' },
    user: { name: 'dp-local-kind-uppercase' },
    host: { id: 'dp-host-2', name: 'dp-host-2.example.com' },
  },

  // Asset doc with user.name and host.id resolves to the local namespace with medium confidence.
  // Priority. Later activity for the same local user: non-priority.
  {
    '@timestamp': at(14),
    event: { kind: 'asset', module: 'okta' },
    user: { name: 'dp-local-asset' },
    host: { id: 'dp-host-3', name: 'dp-host-3.example.com' },
  },
  {
    '@timestamp': at(15),
    event: { kind: 'event', category: 'authentication', type: 'start' },
    user: { name: 'dp-local-asset' },
    host: { id: 'dp-host-3', name: 'dp-host-3.example.com' },
  },

  // Host only. host has no gate, so its output must not change with the flag.
  {
    '@timestamp': at(16),
    event: { kind: 'asset', category: 'host' },
    host: { id: 'dp-host-4', name: 'dp-host-4.example.com', os: { name: 'Linux' } },
  },
  {
    '@timestamp': at(17),
    event: { kind: 'event', category: 'process' },
    host: { id: 'dp-host-4', name: 'dp-host-4.example.com', ip: '10.0.0.4' },
  },
];

/** Users the corpus must produce in every mode, with the namespace their ID ends in. */
export const expectedDualProcessUserIds = [
  'user:okta.only@example.com@okta',
  'user:dp-entra-asset-only@entra_id',
  'user:dp-ad-asset-plus-iam@active_directory',
  'user:dp-okta-asset-then-activity@okta',
  'user:dp-okta-multi-kind@okta',
  'user:dp-local-kind-missing@dp-host-1@local',
  'user:dp-local-kind-null@dp-host-1@local',
  'user:dp-local-kind-event@dp-host-2@local',
  'user:dp-local-kind-uppercase@dp-host-2@local',
  'user:dp-local-asset@dp-host-3@local',
] as const;

/** An IAM lifecycle event alone must not create an IdP user. */
export const unexpectedDualProcessUserIds = ['user:dp-ad-iam-only@active_directory'] as const;

/**
 * Activity older than the asset doc, with a different user.name. Activity: non-priority. Asset:
 * priority. Across runs, newest and oldest values are picked by run order, not log time, so
 * priority-then-non-priority gets this user's lifecycle and name wrong. Kept out of
 * `dualProcessCorpus` so that known divergence does not hide new ones.
 */
export const RUN_ORDER_USER_ID = 'user:dp-okta-activity-before-asset@okta';
export const RUN_ORDER_ACTIVITY = { timestamp: '2026-02-10T18:08:00.000Z', name: 'Activity Name' };
export const RUN_ORDER_ASSET = { timestamp: '2026-02-10T18:20:00.000Z', name: 'Asset Name' };

export const runOrderCorpus: Array<Record<string, unknown>> = [
  {
    '@timestamp': RUN_ORDER_ACTIVITY.timestamp,
    event: { kind: 'event', category: 'authentication', type: 'start', module: 'okta' },
    user: { id: 'dp-okta-activity-before-asset', name: RUN_ORDER_ACTIVITY.name },
  },
  {
    '@timestamp': RUN_ORDER_ASSET.timestamp,
    event: { kind: 'asset', module: 'okta' },
    user: { id: 'dp-okta-activity-before-asset', name: RUN_ORDER_ASSET.name },
  },
];

export const SAMPLING_LOCAL_USERS = 1000;
export const SAMPLING_ASSET_USERS = 20;

/** One doc per local user (non-priority, sampled) plus Okta asset users (priority, never sampled). */
export const samplingCorpus: Array<Record<string, unknown>> = [
  ...Array.from({ length: SAMPLING_LOCAL_USERS }, (_, i) => ({
    '@timestamp': new Date(
      Date.parse(SAMPLING_WINDOW.fromDateISO) + 3_600_000 + i * 1000
    ).toISOString(),
    event: { category: 'authentication', type: 'start' },
    user: { name: `dp-sample-local-${i}` },
    host: { id: 'dp-sample-host', name: 'dp-sample-host.example.com' },
  })),
  ...Array.from({ length: SAMPLING_ASSET_USERS }, (_, i) => ({
    '@timestamp': new Date(
      Date.parse(SAMPLING_WINDOW.fromDateISO) + 3_600_000 + i * 1000
    ).toISOString(),
    event: { kind: 'asset', module: 'okta' },
    user: { id: `dp-sample-okta-${i}`, name: `Sample Okta ${i}` },
  })),
];
