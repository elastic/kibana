/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import type { ClassicAlertFields } from '../types';
import { type BaseRacOptions, findClassicAlerts } from './rac_find';

export interface FetchClassicAlertByIdOptions extends BaseRacOptions {
  id: string;
  abortSignal?: AbortSignal;
  services: { http: HttpStart };
}

/**
 * Reads a single classic alert document by its alert uuid (RBAC enforced by
 * the RAC alerts API) so the classic alert fields flyout can be rendered from the
 * v2 episodes table. Returns the raw `kibana.alert.*` fields plus `_index` (used
 * to decide whether an observability details-page deep link applies).
 */
export const fetchClassicAlertById = async ({
  ruleTypeIds,
  id,
  abortSignal,
  services: { http },
}: FetchClassicAlertByIdOptions): Promise<ClassicAlertFields> => {
  const response = await findClassicAlerts(
    http,
    {
      rule_type_ids: ruleTypeIds,
      query: { bool: { filter: [{ term: { [ALERT_UUID]: id } }] } },
      size: 1,
      track_total_hits: false,
    },
    abortSignal
  );

  const hit = response.hits.hits[0];
  if (!hit?._source) {
    throw new Error(`Classic alert not found: ${id}`);
  }

  return { ...hit._source, _index: hit._index ?? '', _id: hit._id ?? '' } as ClassicAlertFields;
};
