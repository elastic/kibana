/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { esql } from '@elastic/esql';
import { ALERT_EVENTS_DATA_STREAM } from './constants';

export const buildEpisodeEventDataQuery = (spaceId: string, episodeId: string): ComposerQuery => {
  return esql.from([ALERT_EVENTS_DATA_STREAM], ['_source'])
    .where`space_id == ${spaceId}`
    .where`type == "alert"`
    .where`episode.id == ${episodeId}`
    .pipe`EVAL extracted_data = JSON_EXTRACT(_source, "data")`
    .pipe`INLINE STATS
      last_data = LAST(extracted_data, @timestamp) WHERE extracted_data != "{}",
      last_data_timestamp = MAX(@timestamp) WHERE extracted_data != "{}",
      last_event_timestamp = MAX(@timestamp)
      BY \`episode.id\``;
};
