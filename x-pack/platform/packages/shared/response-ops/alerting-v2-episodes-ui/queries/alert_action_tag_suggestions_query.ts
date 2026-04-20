/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM } from '../constants';

export const ALERT_ACTION_TAG_SUGGESTIONS_LIMIT = 20;

export const buildAlertActionTagSuggestionsQuery = (): string =>
  `
FROM ${ALERT_ACTIONS_DATA_STREAM}
| WHERE action_type == "tag" AND episode_id IS NOT NULL
| STATS last_tags = LAST(tags, @timestamp) BY episode_id
| MV_EXPAND last_tags
| STATS cnt = COUNT(*) BY last_tags
| SORT cnt DESC, last_tags ASC
| LIMIT ${ALERT_ACTION_TAG_SUGGESTIONS_LIMIT}
| RENAME last_tags AS tags
| KEEP tags
`.trim();
