/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EpisodeSourceKpis } from '../types/episode_data_source';

const EMPTY_KPIS: EpisodeSourceKpis = {
  alerts_count: 0,
  firing_rules: 0,
  assigned_to_me: 0,
  unassigned: 0,
  acknowledged: 0,
  snoozed: 0,
};

export const mergeKpis = (
  kpis: Array<EpisodeSourceKpis | undefined>
): EpisodeSourceKpis | undefined => {
  const present = kpis.filter((row): row is EpisodeSourceKpis => row != null);

  if (present.length === 0) {
    return undefined;
  }

  return present.reduce<EpisodeSourceKpis>(
    (acc, row) => ({
      alerts_count: acc.alerts_count + (row.alerts_count ?? 0),
      firing_rules: acc.firing_rules + (row.firing_rules ?? 0),
      assigned_to_me: acc.assigned_to_me + (row.assigned_to_me ?? 0),
      unassigned: acc.unassigned + (row.unassigned ?? 0),
      acknowledged: acc.acknowledged + (row.acknowledged ?? 0),
      snoozed: acc.snoozed + (row.snoozed ?? 0),
    }),
    EMPTY_KPIS
  );
};
