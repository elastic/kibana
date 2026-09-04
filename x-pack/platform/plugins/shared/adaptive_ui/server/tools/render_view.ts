/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import type { BuiltinToolDefinition, ToolHandlerContext } from '@kbn/agent-builder-server';
import { parseViewSpec, validateView, type ViewSpec } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';

/**
 * The single emit step. Today it persists the view as a
 * `platform.adaptiveUi.view` attachment; once the `<render type="view">`
 * directive and `/workspace/renders` VFS read API land this becomes
 * "write `/workspace/renders/view/{id}.json` and let the agent emit `<render>`".
 */
const emitView = (
  spec: ViewSpec,
  context: Pick<ToolHandlerContext, 'attachments'>
): ReturnType<ToolHandlerContext['attachments']['add']> =>
  context.attachments.add(
    {
      id: uuidv4(),
      type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
      description: spec.title ? `Adaptive UI view: ${spec.title}` : 'Adaptive UI view',
      data: spec,
    },
    ATTACHMENT_REF_ACTOR.agent
  );

const renderViewSchema = z.object({
  spec: z
    .record(z.string(), z.unknown())
    .describe(
      'A complete Adaptive UI ViewSpec object: `{ type: "view", title?, body: [...] }`. Use `get_authoring_context` for the schema and primitive catalog.'
    ),
  title: z.string().optional().describe('Optional title; overrides `spec.title` when provided.'),
});

export const renderViewTool = (): BuiltinToolDefinition<typeof renderViewSchema> => ({
  id: adaptiveUiTools.renderView,
  type: ToolType.builtin,
  description: `Render an Adaptive UI view inline in chat from a ViewSpec.

Validates the spec, persists it as a ${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE} attachment, and returns its id. Then render it with <render_attachment id="{attachment_id}"/> — do NOT restate the view's content as prose.

On validation failure the errors are returned; fix the spec and call this tool again. Call \`${adaptiveUiTools.getAuthoringContext}\` first if you need the spec schema or primitive catalog.`,
  schema: renderViewSchema,
  tags: ['adaptive-ui'],
  annotations: {
    title: 'Render Adaptive UI view',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async ({ spec, title }, { attachments, logger }) => {
    const candidate = title ? { ...spec, title } : spec;

    // `parseViewSpec` accepts `unknown` and narrows to `ViewSpec`; `validateView`
    // then adds the semantic passes (e.g. id uniqueness) on the trusted shape.
    const parsed = parseViewSpec(candidate);
    const view: ViewSpec | undefined = parsed.spec;
    const validation = view ? validateView(view) : parsed;
    if (!view || !validation.valid) {
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Invalid ViewSpec: ${validation.errors.join('; ')}` },
          },
        ],
      };
    }

    const attachment = await emitView(view, { attachments });

    logger.debug(`Adaptive UI view attachment "${attachment.id}" created.`);

    return {
      results: [
        {
          type: ToolResultType.other as const,
          data: {
            attachment_id: attachment.id,
            version: attachment.current_version ?? 1,
            title: view.title,
          },
        },
      ],
    };
  },
});
