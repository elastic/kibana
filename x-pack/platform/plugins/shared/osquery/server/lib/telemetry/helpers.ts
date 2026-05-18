/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, find, isEmpty, pick, isString } from 'lodash';
import { Frequency } from '@kbn/rrule';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import { LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { PackSavedObject, SavedQuerySavedObject } from '../../common/types';
import { parseRRule } from '../../../common/utils/rrule_parser';
import { parseSplayPermissive } from '../../../common/utils/splay_utils';

/**
 * Constructs the configs telemetry schema from a collection of config saved objects
 */
export const templateConfigs = (configsData: PackagePolicy[]) =>
  configsData.map((item) => ({
    id: item.id,
    version: item.package?.version,
    enabled: item.enabled,
    config: find(item.inputs, ['type', 'osquery'])?.config?.osquery.value,
  }));

/**
 * Counts queries whose persisted `schedule_type` differs from the pack's
 * pack-level `schedule_type`. Packs without a pack-level `schedule_type`
 * return `0` so the flag-off baseline is meaningful — see PR A telemetry
 * note in `tasks.md` 1.10.
 */
const countQueriesWithOverride = (pack: PackSavedObject): number => {
  const packScheduleType = pack.schedule_type ?? null;
  if (packScheduleType === null) return 0;

  return filter(
    pack.queries,
    (query) => query.schedule_type !== undefined && query.schedule_type !== packScheduleType
  ).length;
};

type SplaySecondsBucket = 'none' | 'lt_60s' | 'lt_5m' | 'lt_1h' | 'lt_12h';

const FREQUENCY_TO_LABEL: Record<Frequency, string> = {
  [Frequency.YEARLY]: 'YEARLY',
  [Frequency.MONTHLY]: 'MONTHLY',
  [Frequency.WEEKLY]: 'WEEKLY',
  [Frequency.DAILY]: 'DAILY',
  [Frequency.HOURLY]: 'HOURLY',
  [Frequency.MINUTELY]: 'MINUTELY',
  [Frequency.SECONDLY]: 'SECONDLY',
};

/**
 * Bucket a splay duration string into a small set of histogram-friendly
 * labels. Parse failures (or absence) collapse to `'none'`. Telemetry
 * collection MUST NOT throw — see `design.md` D37.
 */
const bucketSplaySeconds = (splay: string | undefined): SplaySecondsBucket => {
  if (!splay) return 'none';
  try {
    const parsed = parseSplayPermissive(splay);
    if (parsed.kind === 'compound') {
      // Compound durations (e.g. `1h30m`) are rare; bucket conservatively into
      // the largest bucket so they aren't undercounted in the storm-risk view.
      return 'lt_12h';
    }

    const seconds =
      parsed.unit === 'seconds'
        ? parsed.value
        : parsed.unit === 'minutes'
        ? parsed.value * 60
        : parsed.value * 3600;
    if (seconds < 60) return 'lt_60s';
    if (seconds < 300) return 'lt_5m';
    if (seconds < 3600) return 'lt_1h';

    return 'lt_12h';
  } catch {
    return 'none';
  }
};

/**
 * Best-effort RRULE FREQ extraction for the per-pack EBT field. Returns `null`
 * when the pack is not in RRULE mode or the string cannot be parsed.
 * Telemetry collection MUST NOT throw — see `design.md` D37.
 */
const extractRruleFreq = (pack: PackSavedObject): string | null => {
  const rrule = pack.rrule_schedule?.rrule;
  if (!rrule) return null;
  try {
    return FREQUENCY_TO_LABEL[parseRRule(rrule).freq] ?? null;
  } catch {
    return null;
  }
};

/**
 * `true` when the parsed RRULE carries any `_unknown` parts (RFC 5545 keys
 * the Kibana UI does not edit). Surfaces non-Kibana writers (CLI, API,
 * prebuilt-pack importer) writing parts the UI is unaware of.
 */
const hasUnknownRruleParts = (pack: PackSavedObject): boolean => {
  const rrule = pack.rrule_schedule?.rrule;
  if (!rrule) return false;
  try {
    const parsed = parseRRule(rrule);

    return parsed._unknown !== undefined && Object.keys(parsed._unknown).length > 0;
  } catch {
    return false;
  }
};

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templatePacks = (packsData: PackSavedObject[]) => {
  const nonEmptyQueryPacks = filter(packsData, (pack) => !isEmpty(pack.queries));

  return nonEmptyQueryPacks.map((item) => {
    const splay = item.rrule_schedule?.splay;

    return pick(
      {
        name: item.name,
        enabled: item.enabled,
        queries: item.queries,
        policies: (filter(item.references, ['type', LEGACY_AGENT_POLICY_SAVED_OBJECT_TYPE]), 'id')
          ?.length,
        prebuilt:
          !!filter(item.references, ['type', 'osquery-pack-asset']) && item.version !== undefined,
        // `null` when the pack has no pack-level `schedule_type`; the flag-off
        // baseline distinguishes "schedule unspecified" from "explicit interval"
        // and "explicit rrule".
        schedule_type: item.schedule_type ?? null,
        queries_with_override: countQueriesWithOverride(item),
        // PR-A telemetry baseline expansion (design.md D37). All fields below
        // are populated best-effort from the SO; parse failures collapse to
        // safe defaults so telemetry collection never throws.
        queries_count: item.queries?.length ?? 0,
        has_splay: splay !== undefined && splay !== '',
        splay_seconds_bucket: bucketSplaySeconds(splay),
        rrule_freq: extractRruleFreq(item),
        has_unknown_rrule_parts: hasUnknownRruleParts(item),
      },
      [
        'name',
        'queries',
        'policies',
        'prebuilt',
        'enabled',
        'schedule_type',
        'queries_with_override',
        'queries_count',
        'has_splay',
        'splay_seconds_bucket',
        'rrule_freq',
        'has_unknown_rrule_parts',
      ]
    );
  });
};

/**
 * Constructs the packs telemetry schema from a collection of packs saved objects
 */
export const templateSavedQueries = (
  savedQueriesData: SavedQuerySavedObject[],
  prebuiltSavedQueryIds: string[]
) =>
  savedQueriesData.map((item) => ({
    id: item.id,
    query: item.query,
    platform: item.platform,
    interval: isString(item.interval) ? parseInt(item.interval, 10) : item.interval,
    ...(!isEmpty(item.snapshot) ? { snapshot: item.snapshot } : {}),
    ...(!isEmpty(item.removed) ? { snapshot: item.removed } : {}),
    ...(!isEmpty(item.ecs_mapping) ? { ecs_mapping: item.ecs_mapping } : {}),
    prebuilt: prebuiltSavedQueryIds.includes(item.id),
  }));
