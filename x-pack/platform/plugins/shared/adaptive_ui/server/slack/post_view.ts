/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { renderSlack, type ViewSpec } from '@kbn/adaptive-ui';
import { absolutizeViewSpecHrefs } from './absolutize_hrefs';
import { prepareSlackAssets } from './prepare_assets';

export type SlackActionsClient = Awaited<
  ReturnType<ActionsPluginStart['getActionsClientWithRequest']>
>;

/** Uploads one rendered chart and returns the Slack file id to reference from its `image` block. */
const uploadChartAsset = async ({
  actionsClient,
  connectorId,
  bytes,
  altText,
}: {
  actionsClient: SlackActionsClient;
  connectorId: string;
  bytes: Buffer;
  altText: string;
}): Promise<string> => {
  const result = await actionsClient.execute({
    actionId: connectorId,
    params: {
      subAction: 'uploadFile',
      subActionParams: {
        filename: 'chart.png',
        file: bytes.toString('base64'),
        title: altText,
      },
    },
  });

  if (result.status === 'error') {
    throw new Error(result.serviceMessage ?? result.message ?? 'Unknown error');
  }

  const fileId = (result.data as { fileId?: string } | undefined)?.fileId;
  if (!fileId) {
    throw new Error('Slack did not return a file id for the uploaded chart');
  }

  return fileId;
};

export interface PostViewToSlackParams {
  actionsClient: SlackActionsClient;
  connectorId: string;
  channel: string;
  view: ViewSpec;
  /** Public Kibana origin that root-relative `href`s are rewritten against. */
  kibanaUrl: string;
  threadTs?: string;
  logger: Logger;
}

export interface PostViewToSlackResult {
  ts?: string;
  blocks: number;
}

/**
 * Renders a view to Block Kit and posts it through a Slack (v2) connector: the
 * one pipeline behind both the `post_view_to_slack` tool and the share menu's
 * Slack destination. Throws with a user-facing message on failure.
 */
export const postViewToSlack = async ({
  actionsClient,
  connectorId,
  channel,
  view,
  kibanaUrl,
  threadTs,
  logger,
}: PostViewToSlackParams): Promise<PostViewToSlackResult> => {
  const slackSpec = absolutizeViewSpecHrefs(view, kibanaUrl);

  // Slack has no chart block, so chart primitives render as `image` blocks
  // holding a placeholder ref that only becomes postable once the PNG is
  // uploaded. If any part of that fails, re-render without asset collection so
  // the charts degrade to their text form rather than losing the whole post.
  const rendered = renderSlack(slackSpec, { collectAssets: true });
  let { text, blocks } = rendered;

  if (rendered.assets.length > 0) {
    try {
      ({ blocks } = await prepareSlackAssets(rendered, {
        renderPng: async (node) => {
          const { renderNodePng } = await import('./render_png');
          return renderNodePng(node);
        },
        upload: (bytes, altText) =>
          uploadChartAsset({ actionsClient, connectorId, bytes, altText }),
      }));
    } catch (error) {
      logger.warn(
        `Adaptive UI chart assets could not be posted to Slack (${
          (error as Error).message
        }); falling back to text. Uploading files needs the \`files:write\` scope, which the connector's OAuth defaults omit.`
      );
      ({ text, blocks } = renderSlack(slackSpec));
    }
  }

  let executeResult;
  try {
    executeResult = await actionsClient.execute({
      actionId: connectorId,
      params: {
        subAction: 'sendMessage',
        subActionParams: { channel, text, blocks, ...(threadTs ? { threadTs } : {}) },
      },
    });
  } catch (error) {
    throw new Error(
      `Failed to post to Slack via connector "${connectorId}": ${(error as Error).message}`
    );
  }

  if (executeResult.status === 'error') {
    const detail = executeResult.serviceMessage ?? executeResult.message ?? 'Unknown error';
    throw new Error(
      `Slack post failed: ${detail}. Confirm the connector is a Slack (v2) connector authorized with chat:write. \`not_in_channel\` means the app has not joined the channel and lacks chat:write.public; invite it, or grant that scope for public channels.`
    );
  }

  const data = executeResult.data as { ts?: string } | undefined;
  logger.debug(
    `Adaptive UI view posted to Slack channel "${channel}" (ts ${data?.ts ?? 'unknown'}).`
  );

  return { ts: data?.ts, blocks: blocks.length };
};
