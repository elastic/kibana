/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';

export const GRAPH_UI_TAGS = [...tags.stateful.classic];

export const SECREPO_ES_ARCHIVE = 'x-pack/platform/test/fixtures/es_archives/graph/secrepo';

export const SECREPO_INDEX = 'secrepo';
export const SECREPO_TIME_FIELD = '@timestamp';

// Default fields the FTR workspace flow added before running its first query.
export const SECREPO_DEFAULT_FIELDS = ['url.parts', 'url', 'params', 'src'];

// FTR parity: roles used by the security feature-control specs. Mirrors the
// shapes of the FTR `feature_controls/graph_security.ts` roles.
export const GRAPH_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [SECREPO_INDEX], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { graph: ['all'] },
      spaces: ['*'],
    },
  ],
};

export const GRAPH_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: [SECREPO_INDEX], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { graph: ['read'] },
      spaces: ['*'],
    },
  ],
};

export const CUSTOM_SPACE_ID = 'custom_space';
