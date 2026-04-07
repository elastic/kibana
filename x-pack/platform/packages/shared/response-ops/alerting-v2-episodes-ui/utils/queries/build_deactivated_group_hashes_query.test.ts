/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDeactivatedGroupHashesQuery } from './build_deactivated_group_hashes_query';
import { ALERT_ACTIONS_DATA_STREAM } from './constants';

describe('buildDeactivatedGroupHashesQuery', () => {
  it('should query the alert actions data stream', () => {
    const query = buildDeactivatedGroupHashesQuery();
    expect(query).toContain(`FROM "${ALERT_ACTIONS_DATA_STREAM}"`);
  });

  it('should filter for deactivate and activate action types', () => {
    const query = buildDeactivatedGroupHashesQuery();
    expect(query).toContain('action_type IN ("deactivate", "activate")');
  });

  it('should aggregate by group_hash to find the latest action', () => {
    const query = buildDeactivatedGroupHashesQuery();
    expect(query).toContain('STATS');
    expect(query).toContain('LAST(action_type, @timestamp)');
    expect(query).toContain('BY group_hash');
  });

  it('should filter for groups where the latest action is deactivate', () => {
    const query = buildDeactivatedGroupHashesQuery();
    expect(query).toContain('last_deactivate_action == "deactivate"');
  });

  it('should only keep group_hash in the output', () => {
    const query = buildDeactivatedGroupHashesQuery();
    expect(query).toContain('KEEP group_hash');
  });
});
