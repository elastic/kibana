/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_ACTIONS_DATA_STREAM, TAG_OPTIONS_LIMIT } from './constants';

export const buildEpisodeTagOptionsQuery = (spaceId: string): ComposerQuery => {
  return esql.from(ALERT_ACTIONS_DATA_STREAM)
    .where`space_id == ${spaceId}`
    .where`action_type == "tag"`
    .where`tags IS NOT NULL`
    .pipe`MV_EXPAND tags`
    .pipe`STATS BY tags`
    .sort(['tags', 'ASC'])
    .pipe`LIMIT ${TAG_OPTIONS_LIMIT}`;
};
