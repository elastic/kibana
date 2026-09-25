/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVALS_EVIDENCE_LOG_EVENT_NAMES, LOGS_INDEX_PATTERN } from './constants';
import { goldenClusterPrivileges } from './golden_cluster_privileges';

describe('goldenClusterPrivileges', () => {
  it('limits harness API keys to log events used by evidence profiles', () => {
    const { indices } =
      goldenClusterPrivileges.kibana_role_descriptors['kbn-evals-all'].elasticsearch;
    const logsPrivileges = indices.find(({ names }) =>
      (names as readonly string[]).includes(LOGS_INDEX_PATTERN)
    );

    expect(logsPrivileges).toEqual(
      expect.objectContaining({
        privileges: expect.arrayContaining(['read', 'view_index_metadata']),
        query: expect.any(String),
      })
    );
    if (!logsPrivileges || !('query' in logsPrivileges)) {
      throw new Error('Expected logs privileges to include a DLS query');
    }

    expect(JSON.parse(logsPrivileges.query)).toEqual({
      terms: {
        event_name: Object.values(EVALS_EVIDENCE_LOG_EVENT_NAMES),
      },
    });
  });
});
