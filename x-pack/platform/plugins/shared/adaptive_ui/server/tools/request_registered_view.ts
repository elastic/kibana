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
import { resolveLiveView, type ResolveLiveViewDeps } from '../registered_views/resolve_live_view';

const requestRegisteredViewSchema = z.object({
  viewId: z
    .string()
    .max(200)
    .describe(
      'Id of a registered view, e.g. "streams.significantEvent" or "nightshift.investigation".'
    ),
  input: z
    .object({
      event_id: z
        .string()
        .max(500)
        .optional()
        .describe(
          'Stable significant event id. Required for streams.significantEvent. For nightshift.investigation, uses this event’s latest attached investigation when investigation_id is omitted.'
        ),
      investigation_id: z
        .string()
        .max(500)
        .optional()
        .describe(
          'Nightshift investigation id (workflow execution id). Required for nightshift.investigation unless event_id is set.'
        ),
    })
    .optional()
    .describe(
      'Live lookup keys. This tool fetches the event or investigation; it does not accept a field overlay and does not render sample data.'
    ),
});

export interface RequestRegisteredViewDeps extends ResolveLiveViewDeps {
  registry: ViewRegistry<unknown, PrimitiveNode>;
}

export const requestRegisteredViewTool = ({
  registry,
  getSignificantEvents,
  getNightshiftInvestigations,
}: RequestRegisteredViewDeps): BuiltinToolDefinition<typeof requestRegisteredViewSchema> => {
  const describeViews = () =>
    registry
      .list()
      .map((view) => `- \`${view.id}\`: ${view.description}`)
      .join('\n');

  return {
    id: adaptiveUiTools.requestRegisteredView,
    type: ToolType.builtin,
    description: `Render a code-owned Adaptive UI view by id from live data.

Pass \`event_id\` for \`streams.significantEvent\`, or \`investigation_id\` (or \`event_id\`) for \`nightshift.investigation\`. This looks up the record; it does not merge sample fixtures.

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
    handler: async ({ viewId, input }, { attachments, logger, request }) => {
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

      const resolved = await resolveLiveView(viewId, input ?? {}, request, {
        getSignificantEvents,
        getNightshiftInvestigations,
      });
      if (!resolved.ok) {
        return {
          results: [
            {
              type: ToolResultType.error,
              data: { message: resolved.message },
            },
          ],
        };
      }

      const { spec } = resolved;
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
