/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Source-filter ids for the unified alerts table.
 *
 * `v1` and `v2` match the row source ids used by the episodes UI
 * (`CLASSIC_EPISODE_SOURCE_ID`, `ALERTING_V2_EPISODE_SOURCE_ID`). Any other
 * value is a connector slug stored on the episode `source` field.
 */

/**
 * `source` written on events of native v2 rules. It is not a selectable
 * filter option; Universal covers it.
 */
export const NATIVE_EPISODE_SOURCE = 'internal';

/** Classic alerts, fetched from the v1 pipeline rather than an ES field. */
export const EPISODE_SOURCE_FILTER_CLASSIC = 'v1' as const;

/** Native Universal alerts: document `source` is empty or {@link NATIVE_EPISODE_SOURCE}. */
export const EPISODE_SOURCE_FILTER_UNIVERSAL = 'v2' as const;

export const EPISODE_SOURCE_FILTER_SYSTEM_IDS = [
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
] as const;

export type EpisodeSourceFilterSystemId = (typeof EPISODE_SOURCE_FILTER_SYSTEM_IDS)[number];

const RESERVED_SOURCE_FILTER_IDS: ReadonlySet<string> = new Set(EPISODE_SOURCE_FILTER_SYSTEM_IDS);

export const isEpisodeSourceFilterSystemId = (
  value: string
): value is EpisodeSourceFilterSystemId => RESERVED_SOURCE_FILTER_IDS.has(value);

/** A connector slug safe to offer and match. Empty, native, and reserved system ids are not. */
export const isConnectorEpisodeSource = (source: string | null | undefined): source is string =>
  typeof source === 'string' &&
  source.length > 0 &&
  source !== NATIVE_EPISODE_SOURCE &&
  !isEpisodeSourceFilterSystemId(source);
