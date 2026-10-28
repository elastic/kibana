/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import {
  buildEpisodeConnectorSourceOptionsQuery,
  CONNECTOR_SOURCE_OPTIONS_LIMIT,
} from './episode_connector_source_options_query';

const SPACE_ID = 'default';

describe('buildEpisodeConnectorSourceOptionsQuery', () => {
  it('queries distinct connector sources on alert events', () => {
    const queryString = buildEpisodeConnectorSourceOptionsQuery(SPACE_ID).print('basic');

    expect(queryString).toContain(`FROM ${ALERT_EVENTS_DATA_STREAM}`);
    expect(queryString).toContain('WHERE space_id == "default"');
    expect(queryString).toContain('type == "alert"');
    expect(queryString).toContain('source IS NOT NULL');
    expect(queryString).toContain('source != ""');
    expect(queryString).toContain('source != "internal"');
    expect(queryString).toContain('source != "v1"');
    expect(queryString).toContain('source != "v2"');
    expect(queryString).toContain('STATS BY source');
    expect(queryString).toContain('SORT source ASC');
    expect(queryString).toContain(`LIMIT ${CONNECTOR_SOURCE_OPTIONS_LIMIT}`);
  });
});
