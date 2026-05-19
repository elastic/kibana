/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { skillCreateRequestObjectSchema } from '@kbn/agent-builder-common/skills/validation';
import type { z } from '@kbn/zod';

/**
 * Attachment type id for skills authored via chat.
 *
 * A `skill` attachment is a versioned, by-value snapshot of a candidate
 * skill payload (matching the public `POST /api/agent_builder/skills` request
 * body). It is created by the skill-authoring inline tools and rendered as an
 * inline card with a primary "Create" action. Once persisted, the attachment's
 * `origin` is set to the persisted skill id via `updateOrigin` so the same
 * card can show "Created" state on subsequent renders.
 */
export const SKILL_ATTACHMENT_TYPE = 'skill' as const;

/**
 * Data shape stored on a `skill` attachment version.
 */
export type SkillAttachmentData = z.infer<typeof skillCreateRequestObjectSchema>;

export type SkillAttachment = Attachment<typeof SKILL_ATTACHMENT_TYPE, SkillAttachmentData>;
