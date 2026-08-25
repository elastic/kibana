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
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { PrimitiveNode, ViewRegistry } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';

const requestRegisteredViewSchema = z.object({
  viewId: z
    .string()
    .describe(
      'Id of a registered view, e.g. "streams.significantEvent" or "nightshift.investigation".'
    ),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Optional input overrides for the view. Omit to render the curated default.'),
});

export interface RequestRegisteredViewDeps {
  registry: ViewRegistry<unknown, PrimitiveNode>;
}

export const requestRegisteredViewTool = ({
  registry,
}: RequestRegisteredViewDeps): BuiltinToolDefinition<typeof requestRegisteredViewSchema> => {
  const describeViews = () =>
    registry
      .list()
      .map((view) => `- \`${view.id}\`: ${view.description}`)
      .join('\n');

  return {
    id: adaptiveUiTools.requestRegisteredView,
    type: ToolType.builtin,
    description: `Render a code-owned, curated Adaptive UI view by id. Prefer this over \`${
      adaptiveUiTools.renderView
    }\` when a registered view matches the request.

Persists the built view as a ${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE} attachment and returns its id; render it with <render_attachment id="{attachment_id}"/>.

Available views:
${describeViews() || '- (none registered)'}`,
    schema: requestRegisteredViewSchema,
    tags: ['adaptive-ui'],
    annotations: {
      title: 'Request registered Adaptive UI view',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    handler: async ({ viewId, input }, { attachments, logger }) => {
      if (!registry.get(viewId)) {
        const available = registry
          .list()
          .map((view) => view.id)
          .join(', ');
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Unknown view "${viewId}". Available views: ${available || 'none'}.`,
              },
            },
          ],
        };
      }

      const response = await registry.request(viewId, undefined, input);
      if (!response.validation.valid) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Registered view "${viewId}" produced an invalid ViewSpec: ${response.validation.errors.join(
                  '; '
                )}`,
              },
            },
          ],
        };
      }

      const { spec } = response;
      const attachment = await attachments.add(
        {
          id: uuidv4(),
          type: ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE,
          description: spec.title ? `Adaptive UI view: ${spec.title}` : 'Adaptive UI view',
          data: spec,
        },
        ATTACHMENT_REF_ACTOR.agent
      );

      logger.debug(
        `Adaptive UI registered view "${viewId}" attachment "${attachment.id}" created.`
      );

      return {
        results: [
          {
            type: ToolResultType.other as const,
            data: {
              attachment_id: attachment.id,
              version: attachment.current_version ?? 1,
              view_id: viewId,
              title: spec.title,
            },
          },
        ],
      };
    },
  };
};
