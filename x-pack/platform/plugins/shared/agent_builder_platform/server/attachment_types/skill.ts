/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AttachmentTypeDefinition,
  SurfaceComposition,
  SurfaceNode,
} from '@kbn/agent-builder-server/attachments';
import { AGENT_BUILDER_APP_ID } from '@kbn/deeplinks-agent-builder';
import { i18n } from '@kbn/i18n';
import {
  SKILL_ATTACHMENT_TYPE,
  skillAttachmentDataSchema,
  type SkillAttachmentData,
} from '../../common/attachments';
import { SURFACE_LIMITS, clampText, hasText } from './surface_helpers';

/** Agent Builder's skills page, which the browser card's "Edit in Management" opens. */
const SKILLS_MANAGE_PATH = '/manage/skills';

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
  toSurfaceComposition: ({ data: { skill }, origin }) => toSkillSurfaceComposition(skill, origin),
  getAgentDescription: () => {
    return `A \`skill\` attachment is a versioned draft of an Agent Builder skill. When \`mode\` is "create" the card shows a "Create" button (POST). When \`mode\` is "edit" the card shows an "Edit in Management" link if the skill has no unsaved changes, or a "Save changes" button (PUT) once edits are present. \`skill.id\` always identifies the persisted skill. In both cases \`skill\` holds the full content including \`id\`. Render it inline by emitting <render_attachment id="ATTACHMENT_ID" />. Emit at most one render per round — if you call \`patch_skill\` after loading or proposing the skill, hold the render until after the final patch so the user sees a single up-to-date card. Do not invent attachment ids — only render ids returned by propose_skill, load_skill_for_editing, or patch_skill.`;
  },
});

/**
 * The skill's description, tools and files, and its content as code. Once it's persisted, which
 * the attachment's `origin` records, it links to its page in Management, as the browser card does.
 */
const toSkillSurfaceComposition = (
  {
    id,
    name,
    description,
    content,
    tool_ids: toolIds,
    referenced_content: referencedContent,
  }: SkillAttachmentData['skill'],
  origin: string | undefined
): SurfaceComposition => {
  const files = (referencedContent ?? []).map(
    ({ relativePath, name: fileName }) => `${relativePath}/${fileName}.md`
  );

  const items = [
    toolIds.length > 0 && {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.surface.tools', {
        defaultMessage: 'Tools',
      }),
      value: clampText(toolIds.join(', '), SURFACE_LIMITS.fieldValue),
    },
    files.length > 0 && {
      label: i18n.translate('xpack.agentBuilderPlatform.attachments.skill.surface.files', {
        defaultMessage: 'Files',
      }),
      value: clampText(files.join(', '), SURFACE_LIMITS.fieldValue),
    },
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  const isContentCut = content.length > SURFACE_LIMITS.codeText;

  const body: SurfaceNode[] = [
    ...(hasText(description) ? [{ type: 'markdown' as const, text: description }] : []),
    ...(items.length > 0 ? [{ type: 'fields' as const, items }] : []),
    ...(hasText(content)
      ? [
          {
            type: 'code' as const,
            language: 'markdown',
            text: clampText(content, SURFACE_LIMITS.codeText),
          },
        ]
      : []),
    ...(isContentCut
      ? [
          {
            type: 'context' as const,
            items: [
              {
                text: i18n.translate(
                  'xpack.agentBuilderPlatform.attachments.skill.surface.contentCut',
                  {
                    defaultMessage: 'Showing the first {shown} of {total} characters of SKILL.md.',
                    values: { shown: SURFACE_LIMITS.codeText, total: content.length },
                  }
                ),
              },
            ],
          },
        ]
      : []),
    ...(origin
      ? [
          {
            type: 'link' as const,
            label: i18n.translate(
              'xpack.agentBuilderPlatform.attachments.skill.surface.editInManagement',
              { defaultMessage: 'Edit in Management' }
            ),
            app: AGENT_BUILDER_APP_ID,
            path: `${SKILLS_MANAGE_PATH}/${encodeURIComponent(origin)}`,
          },
        ]
      : []),
  ];

  return { type: 'view', title: name, subtitle: id, body };
};
