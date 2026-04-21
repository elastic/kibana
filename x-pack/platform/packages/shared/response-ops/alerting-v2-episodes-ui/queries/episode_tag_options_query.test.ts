/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ACTIONS_DATA_STREAM } from '../constants';
import { buildEpisodeTagOptionsQuery } from './episode_tag_options_query';

describe('buildEpisodeTagOptionsQuery', () => {
  it('should query distinct tags from tag actions', () => {
    const queryString = buildEpisodeTagOptionsQuery().print('basic');

    expect(queryString).toContain(`FROM ${ALERT_ACTIONS_DATA_STREAM}`);
    expect(queryString).toContain('action_type == "tag"');
    expect(queryString).toContain('MV_EXPAND tags');
    expect(queryString).toContain('STATS BY tags');
    expect(queryString).toContain('LIMIT 500');
  });
});
