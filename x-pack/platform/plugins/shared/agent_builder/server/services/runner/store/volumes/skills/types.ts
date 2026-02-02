/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FileEntry } from '@kbn/agent-builder-server/runner/filestore';

export interface SkillEntryMeta {
  skill_name: string;
  skill_description: string;
  skill_id: string;
}

export type SkillFileEntry<TData extends object = object> = FileEntry<TData, SkillEntryMeta>;

export interface SkillReferencedContentEntryMeta {
  skill_id: string;
}

export type SkillReferencedContentFileEntry<TData extends object = object> = FileEntry<
  TData,
  SkillReferencedContentEntryMeta
>;
