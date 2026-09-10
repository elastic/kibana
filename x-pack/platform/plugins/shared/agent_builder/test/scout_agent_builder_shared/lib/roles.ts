/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

/**
 * Builds a Kibana role scoped to a single space (or `'*'`) with the given Agent
 * Builder sub-feature privileges. `actions: ['read']` lets the persona read the
 * LLM connector so the chat UI does not error. Shared by the API and UI Scout
 * specs so the privilege shape stays in one place.
 */
export function agentBuilderRole(spaceId: string, privileges: string[]): KibanaRole {
  return {
    elasticsearch: { cluster: [], indices: [] },
    kibana: [
      {
        base: [],
        feature: {
          agentBuilder: privileges,
          actions: ['read'],
        },
        spaces: [spaceId],
      },
    ],
  };
}
