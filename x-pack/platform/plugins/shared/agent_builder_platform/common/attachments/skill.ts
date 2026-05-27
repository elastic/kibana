/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { skillCreateRequestObjectSchema } from '@kbn/agent-builder-common/skills/validation';
import type { z } from '@kbn/zod';

export const SKILL_ATTACHMENT_TYPE = 'skill' as const;

/**
 * Data shape stored on a `skill` attachment version.
 */
export type SkillAttachmentData = z.infer<typeof skillCreateRequestObjectSchema>;

export type SkillAttachment = Attachment<typeof SKILL_ATTACHMENT_TYPE, SkillAttachmentData>;
