/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';

export const AGENT_MEMORY_FEATURE_ID = 'agentMemory';

/** API privilege names. Follow <operation>_<subject> with underscores only. */
export const AGENT_MEMORY_API_PRIVILEGES = {
  /** Read memories: `recall`, ES|QL self-service. */
  read: 'read_agent_memory',
  /** Write memories: `remember`, `forget`. */
  write: 'write_agent_memory',
} as const;

export const registerFeatures = ({ features }: { features: FeaturesPluginSetup }) => {
  features.registerKibanaFeature({
    id: AGENT_MEMORY_FEATURE_ID,
    name: 'Agent Memory',
    order: 9500,
    category: DEFAULT_APP_CATEGORIES.kibana,
    // No dedicated app in Phase 1 — feature exists only for privilege gating.
    app: ['kibana'],
    management: { ai: [AGENT_MEMORY_FEATURE_ID] },
    privileges: {
      all: {
        app: ['kibana'],
        api: [AGENT_MEMORY_API_PRIVILEGES.read, AGENT_MEMORY_API_PRIVILEGES.write],
        management: { ai: [AGENT_MEMORY_FEATURE_ID] },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
      read: {
        app: ['kibana'],
        api: [AGENT_MEMORY_API_PRIVILEGES.read],
        management: { ai: [AGENT_MEMORY_FEATURE_ID] },
        savedObject: {
          all: [],
          read: [],
        },
        ui: [],
      },
    },
  });
};
