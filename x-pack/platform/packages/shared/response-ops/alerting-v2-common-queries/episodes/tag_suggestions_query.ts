/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeStringValue } from '@kbn/esql-utils';
import { ALERT_ACTIONS_DATA_STREAM, TAG_SUGGESTIONS_LIMIT } from './constants';

export const buildTagSuggestionsQuery = (spaceId: string): string =>
  `FROM ${ALERT_ACTIONS_DATA_STREAM}
| WHERE space_id == ${escapeStringValue(spaceId)} AND action_type == "tag" AND episode_id IS NOT NULL
| STATS last_tags = LAST(tags, @timestamp) BY episode_id
| MV_EXPAND last_tags
| STATS cnt = COUNT(*) BY last_tags
| SORT cnt DESC, last_tags ASC
| LIMIT ${TAG_SUGGESTIONS_LIMIT}
| RENAME last_tags AS tags
| KEEP tags`;
