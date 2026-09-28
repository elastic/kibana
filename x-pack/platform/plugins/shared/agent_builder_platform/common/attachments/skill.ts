/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { skillCreateRequestSchema } from '@kbn/agent-builder-common';

export const SKILL_ATTACHMENT_TYPE = 'skill' as const;

export const skillAttachmentDataSchema = z.object({
  mode: z.enum(['create', 'edit']),
  skill: skillCreateRequestSchema,
  /**
   * Snapshot of the skill content this draft is being diffed against.
   * - `mode: 'create'`: the first draft's content (set by `propose_skill`).
   * - `mode: 'edit'`: the persisted skill's content at the time the draft was
   *   opened (set by `load_skill_for_editing`).
   * Preserved across `patch_skill` calls.
   */
  originalContent: z.string().optional(),
});

/**
 * Data shape stored on a `skill` attachment version.
 *
 * - `mode: 'create'` — new skill draft; `skill` matches the POST request body.
 * - `mode: 'edit'`   — edit draft for an existing skill; `skill.id` is the
 *   persisted skill's id used as the PUT path parameter.
 */
export type SkillAttachmentData = z.infer<typeof skillAttachmentDataSchema>;

export type SkillAttachment = Attachment<typeof SKILL_ATTACHMENT_TYPE, SkillAttachmentData>;
