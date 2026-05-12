/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM } from '../constants';

export interface EpisodeTagOptionRow {
  tags: string;
}

/**
 * Distinct tag values from tag actions in the selected time range (via kibana_context).
 */
export const buildEpisodeTagOptionsQuery = () =>
  // prettier-ignore
  esql
    .from(ALERT_ACTIONS_DATA_STREAM)
    .where`action_type == "tag"`
    .where`tags IS NOT NULL`
    .pipe`MV_EXPAND tags`
    .pipe`STATS BY tags`
    .sort(['tags', 'ASC'])
    .pipe`LIMIT 500`;
