/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  ALERT_ACTION_TAG_SUGGESTIONS_LIMIT,
  buildAlertActionTagSuggestionsQuery,
} from './alert_action_tag_suggestions_query';

describe('buildAlertActionTagSuggestionsQuery', () => {
  it('reads the last tags of each alert from the tag actions of the space', () => {
    const query = buildAlertActionTagSuggestionsQuery('my-space');

    expect(query).toContain(`FROM ${ALERT_ACTIONS_DATA_STREAM}`);
    expect(query).toContain(
      'WHERE space_id == "my-space" AND action_type == "tag" AND alert_id IS NOT NULL'
    );
    expect(query).toContain('STATS last_tags = LAST(tags, @timestamp) BY alert_id');
    expect(query).not.toContain('episode_id');
  });

  it('ranks the tags by usage and caps the suggestions', () => {
    const query = buildAlertActionTagSuggestionsQuery('default');

    expect(query).toContain('STATS cnt = COUNT(*) BY last_tags');
    expect(query).toContain('SORT cnt DESC, last_tags ASC');
    expect(query).toContain(`LIMIT ${ALERT_ACTION_TAG_SUGGESTIONS_LIMIT}`);
  });
});
