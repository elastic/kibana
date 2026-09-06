/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { parseViewSpec, validateView } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE, adaptiveUiTools } from '../../common/constants';
import { getKibanaPublicUrl, type KibanaPublicUrlHttp } from '../kibana_public_url';
import { postViewToSlack } from '../slack/post_view';

const postViewToSlackSchema = z.object({
  connectorId: z
    .string()
    .min(1)
    .describe(
      'Slack (v2) connector instance ID, from the connector attachment. Must be a `.slack2` connector authorized with `chat:write`.'
    ),
  channel: z
    .string()
    .min(1)
    .describe(
      "Slack conversation ID to post to (C… for channels, G… for private channels, D… for DMs). Use the Slack connector's listChannels or resolveChannelId to find it."
    ),
  attachmentId: z
    .string()
    .optional()
    .describe(
      `ID of an existing ${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE} attachment to post as Block Kit. Provide this or \`spec\`.`
    ),
  spec: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('An inline Adaptive UI ViewSpec to render and post. Provide this or `attachmentId`.'),
  threadTs: z
    .string()
    .optional()
    .describe('Timestamp of a Slack message to reply to (posts the view in that thread).'),
});

export interface PostViewToSlackDeps {
  /** Lazy getter for the Actions plugin start contract (resolved at handler invocation time). */
  getActions: () => Promise<ActionsPluginStart>;
  http: KibanaPublicUrlHttp;
}

const errorResult = (message: string) => ({
  results: [{ type: ToolResultType.error as const, data: { message } }],
});

/**
 * Renders an Adaptive UI view to Slack Block Kit and posts it through a Slack
 * (v2) connector — the in-product, full-fidelity counterpart to the offline
 * `post_to_slack_demo` script. The connector's `sendMessage` carries the blocks
 * (with `renderSlack`'s `text` as the notification fallback) and its
 * `uploadFile` carries any chart images, so auth, secrets, retries, and
 * rate-limit handling stay in the connector.
 */
export const postViewToSlackTool = ({
  getActions,
  http,
}: PostViewToSlackDeps): BuiltinToolDefinition<typeof postViewToSlackSchema> => ({
  id: adaptiveUiTools.postViewToSlack,
  type: ToolType.builtin,
  description: `Post an Adaptive UI view to Slack as native Block Kit via a Slack (v2) connector.

Renders the view — an existing ${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE} attachment (\`attachmentId\`) or an inline \`spec\` — to Slack Block Kit and sends it with the connector's sendMessage sub-action. Charts are uploaded as images; without the files:write scope they fall back to their text form. Requires a \`.slack2\` connector authorized with chat:write; posting to a public channel the app has not joined additionally needs chat:write.public, and a private channel needs an invite. Resolve the channel ID first with the Slack connector's listChannels or resolveChannelId.`,
  schema: postViewToSlackSchema,
  tags: ['adaptive-ui', 'connector', 'slack'],
  annotations: {
    title: 'Post Adaptive UI view to Slack',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  availability: {
    cacheMode: 'global',
    handler: async ({ uiSettings }) => {
      const enabled = await uiSettings.get<boolean>(AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID);
      return enabled
        ? { status: 'available' }
        : {
            status: 'unavailable',
            reason:
              'Posting a view to Slack requires Agent Builder experimental features to be enabled',
          };
    },
  },
  handler: async ({ connectorId, channel, attachmentId, spec, threadTs }, context) => {
    const { attachments, logger, request, spaceId } = context;

    let candidate: unknown;
    if (attachmentId) {
      const snapshot = attachments.get(attachmentId);
      if (!snapshot) {
        return errorResult(`No attachment "${attachmentId}" found in this conversation.`);
      }
      if (snapshot.type !== ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE) {
        return errorResult(
          `Attachment "${attachmentId}" is a ${snapshot.type}, not a ${ADAPTIVE_UI_VIEW_ATTACHMENT_TYPE}.`
        );
      }
      candidate = snapshot.data.data;
    } else if (spec) {
      candidate = spec;
    } else {
      return errorResult(
        'Provide either `attachmentId` (an existing Adaptive UI view) or `spec` (an inline ViewSpec).'
      );
    }

    // `parseViewSpec` narrows `unknown` to `ViewSpec`; `validateView` then runs
    // the semantic passes before we render.
    const parsed = parseViewSpec(candidate);
    const view = parsed.spec;
    const validation = view ? validateView(view) : parsed;
    if (!view || !validation.valid) {
      return errorResult(`Invalid ViewSpec: ${validation.errors.join('; ')}`);
    }

    const actions = await getActions();
    const actionsClient = await actions.getActionsClientWithRequest(request);

    let posted;
    try {
      posted = await postViewToSlack({
        actionsClient,
        connectorId,
        channel,
        view,
        kibanaUrl: getKibanaPublicUrl({ http, spaceId }),
        threadTs,
        logger,
      });
    } catch (error) {
      return errorResult((error as Error).message);
    }

    return {
      results: [
        {
          type: ToolResultType.other as const,
          data: { channel, ts: posted.ts, blocks: posted.blocks, title: view.title },
        },
      ],
    };
  },
});
