/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';
import {
  SKILL_ATTACHMENT_TYPE,
  skillAttachmentDataSchema,
  type SkillAttachmentData,
} from '../../common/attachments';

/**
 * Server-side definition for the `skill` attachment type.
 *
 * Notes:
 * - `validate` reuses `skillCreateRequestSchema` so the payload is guaranteed
 *   to round-trip into `POST /api/agent_builder/skills` without a separate
 *   schema in this package.
 * - `format` returns a compact text representation so the LLM can self-correct
 *   on subsequent turns without re-fetching the full attachment.
 * - There is no `resolve()` because these attachments always start as by-value.
 *   Once persisted, the UI calls `updateOrigin(skill.id)` which stores the
 *   persisted skill id as opaque metadata; we don't need to re-resolve content
 *   from origin (the attachment is the authoritative source until it's
 *   persisted).
 */
export const createSkillAttachmentType = (): AttachmentTypeDefinition<
  typeof SKILL_ATTACHMENT_TYPE,
  SkillAttachmentData
> => ({
  id: SKILL_ATTACHMENT_TYPE,
  validate: (input) => {
    const parsed = skillAttachmentDataSchema.safeParse(input);
    if (parsed.success) {
      return { valid: true, data: parsed.data };
    }
    return {
      valid: false,
      error: parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; '),
    };
  },
  format: (attachment) => {
    return {
      getRepresentation: () => {
        const {
          data: { skill },
        } = attachment;
        const referencedSummary = (skill.referenced_content ?? [])
          .map((item) => `- ${item.relativePath}/${item.name}.md`)
          .join('\n');
        const value = [
          `Skill (id: ${skill.id})`,
          `Name: ${skill.name}`,
          `Description: ${skill.description}`,
          `Tools: ${skill.tool_ids.join(', ') || '(none)'}`,
          referencedSummary
            ? `Referenced files:\n${referencedSummary}`
            : 'Referenced files: (none)',
          '',
          'SKILL.md content:',
          skill.content,
        ].join('\n');
        return { type: 'text', value };
      },
    };
  },
  getAgentDescription: () => {
    return `A \`skill\` attachment is a versioned draft of an Agent Builder skill. When \`mode\` is "create" the card shows a "Create" button (POST). When \`mode\` is "edit" the card shows an "Edit in Management" link if the skill has no unsaved changes, or a "Save changes" button (PUT) once edits are present. \`skill.id\` always identifies the persisted skill. In both cases \`skill\` holds the full content including \`id\`. Render it inline by emitting <render_attachment id="ATTACHMENT_ID" />. After patching, re-render the same attachment id so the card refreshes in place. Do not invent attachment ids — only render ids returned by propose_skill, load_skill_for_editing, or patch_skill.`;
  },
});
