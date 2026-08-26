/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiamOAuthProjectType } from '@kbn/core-security-server';
import {
  KIBANA_OBSERVABILITY_SOLUTION,
  KIBANA_SEARCH_SOLUTION,
  KIBANA_SECURITY_SOLUTION,
  KIBANA_VECTORDB_SOLUTION,
  type KibanaSolution,
} from '@kbn/projects-solutions-groups';

/**
 * Maps a Kibana solution onto the project type UIAM understands. Solutions absent
 * from this map are not supported by UIAM.
 */
export const KIBANA_SOLUTION_TO_UIAM_PROJECT_TYPE: Partial<
  Record<KibanaSolution, UiamOAuthProjectType>
> = {
  [KIBANA_SEARCH_SOLUTION]: 'elasticsearch',
  [KIBANA_OBSERVABILITY_SOLUTION]: 'observability',
  [KIBANA_SECURITY_SOLUTION]: 'security',
  [KIBANA_VECTORDB_SOLUTION]: 'vectordb',
};
