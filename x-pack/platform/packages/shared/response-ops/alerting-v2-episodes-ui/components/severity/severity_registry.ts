/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBadgeProps } from '@elastic/eui';
import {
  EpisodeSeverity,
  EPISODE_SEVERITIES,
  EPISODE_SEVERITY_CHART_VALUE,
} from '@kbn/alerting-v2-common-queries';
import type { SeverityExtension } from '../../types/episode_data_source';
import { EPISODE_SEVERITY_BADGE_COLORS } from './severity_utils';
import * as i18n from './translations';

/** Unified entry in the merged severity registry. */
export interface SeverityRegistryEntry {
  value: string;
  label: string;
  color: NonNullable<EuiBadgeProps['color']>;
  sortRank: number;
  filterDotColor?: string;
}

/** Lookup map keyed by severity value for O(1) access. */
export type SeverityRegistryMap = ReadonlyMap<string, SeverityRegistryEntry>;

const EPISODE_SEVERITY_LABELS: Record<EpisodeSeverity, string> = {
  [EpisodeSeverity.Info]: i18n.EPISODE_SEVERITY_INFO_LABEL,
  [EpisodeSeverity.Low]: i18n.EPISODE_SEVERITY_LOW_LABEL,
  [EpisodeSeverity.Medium]: i18n.EPISODE_SEVERITY_MEDIUM_LABEL,
  [EpisodeSeverity.High]: i18n.EPISODE_SEVERITY_HIGH_LABEL,
  [EpisodeSeverity.Critical]: i18n.EPISODE_SEVERITY_CRITICAL_LABEL,
};

// Resolved theme color keys per severity (rather than named tokens like `danger`) so the filter
// dot keeps its color when its row is highlighted/selected: `EuiIcon` applies custom color values
// inline, which beats `EuiSelectable`'s highlighted-row recolor.
const BUILTIN_DOT_COLORS: Record<EpisodeSeverity, string> = {
  [EpisodeSeverity.Critical]: 'textDanger',
  [EpisodeSeverity.High]: 'textRisk',
  [EpisodeSeverity.Medium]: 'textSuccess',
  [EpisodeSeverity.Low]: 'textPrimary',
  [EpisodeSeverity.Info]: 'textParagraph',
};

const BUILTIN_ENTRIES: SeverityRegistryEntry[] = EPISODE_SEVERITIES.map((severity) => ({
  value: severity,
  label: EPISODE_SEVERITY_LABELS[severity],
  color: EPISODE_SEVERITY_BADGE_COLORS[severity],
  sortRank: EPISODE_SEVERITY_CHART_VALUE[severity],
  filterDotColor: BUILTIN_DOT_COLORS[severity],
}));

/**
 * Builds a merged severity registry from built-in v2 severities and any
 * custom `SeverityExtension`s contributed by data sources. The result is
 * ordered by ascending `sortRank` and keyed by value for O(1) lookup.
 */
export const buildSeverityRegistry = (
  extensions: SeverityExtension[] = []
): SeverityRegistryEntry[] => {
  const extensionEntries: SeverityRegistryEntry[] = extensions.map((ext) => ({
    value: ext.value,
    label: ext.label,
    color: ext.color,
    sortRank: ext.sortRank,
    filterDotColor: ext.filterDotColor,
  }));

  return [...BUILTIN_ENTRIES, ...extensionEntries].sort((a, b) => a.sortRank - b.sortRank);
};

export const toSeverityRegistryMap = (entries: SeverityRegistryEntry[]): SeverityRegistryMap =>
  new Map(entries.map((entry) => [entry.value, entry]));

/**
 * Creates a rank resolver function suitable for pure helpers like `mergeEpisodes`
 * that cannot access React context.
 */
export const createSeverityRankResolver = (
  registryMap: SeverityRegistryMap
): ((severity: string | null | undefined) => number) => {
  return (severity) => {
    if (severity == null) return -1;
    return registryMap.get(severity.toLowerCase())?.sortRank ?? -1;
  };
};
