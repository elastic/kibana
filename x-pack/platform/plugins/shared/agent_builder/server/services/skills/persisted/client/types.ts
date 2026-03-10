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
  plugin_id?: string;
  /**
   * Number of referenced content items.
   * Computed from the `referenced_content` array length, or via ES runtime field when using `summaryOnly`.
   */
  referenced_content_count: number;
  created_at: string;
  updated_at: string;
}

export interface SkillListOptions {
  /** When true, excludes `content` and `referenced_content` from ES results and populates `referenced_content_count`. */
  summaryOnly?: boolean;
}
