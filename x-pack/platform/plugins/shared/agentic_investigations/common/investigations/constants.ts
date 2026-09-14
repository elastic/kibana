/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INVESTIGATION_ROUTE_BASE = '/internal/investigations/investigations' as const;

/**
 * The `.kibana-` prefix is deliberate and permanent: `.kibana*` is already
 * granted to the `kibana_system` role, so this index needs no Elasticsearch-side
 * system index registration. Each entity this plugin owns gets its own index
 * rather than one discriminated by type.
 */
export const INVESTIGATION_INDEX_NAME = '.kibana-investigations' as const;

export const INVESTIGATION_ATTACHMENT_IDS = {
  IMPACT: 'investigations.impact',
  HYPOTHESES: 'investigations.hypotheses',
  RECOMMENDATIONS: 'investigations.recommendations',
  BLIND_SPOTS: 'investigations.blind_spots',
} as const;
