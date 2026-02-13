/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SkillReferencedContent } from '@kbn/agent-builder-common';
import type { SkillProperties } from './storage';

export type SkillDocument = Pick<GetResponse<SkillProperties>, '_source' | '_id'>;

export interface SkillPersistedDefinition {
  id: string;
  name: string;
  description: string;
  content: string;
  referenced_content?: SkillReferencedContent[];
  tool_ids: string[];
  created_at: string;
  updated_at: string;
}
