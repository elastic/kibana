/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useAdditionalEpisodesDataSource } from '../context/episode_data_source_context';
import {
  buildSeverityRegistry,
  toSeverityRegistryMap,
  createSeverityRankResolver,
  type SeverityRegistryEntry,
  type SeverityRegistryMap,
} from '../components/severity/severity_registry';

export interface UseSeverityRegistryResult {
  entries: SeverityRegistryEntry[];
  registryMap: SeverityRegistryMap;
  rankResolver: (severity: string | null | undefined) => number;
}

/** Builds a merged severity registry from built-in v2 severities and data-source extensions. */
export const useSeverityRegistry = (): UseSeverityRegistryResult => {
  const additionalSource = useAdditionalEpisodesDataSource();

  return useMemo(() => {
    const entries = buildSeverityRegistry(additionalSource?.severityExtensions);
    const registryMap = toSeverityRegistryMap(entries);
    const rankResolver = createSeverityRankResolver(registryMap);
    return { entries, registryMap, rankResolver };
  }, [additionalSource?.severityExtensions]);
};
