/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType, type SlackPayloadAsset } from '@kbn/agent-builder-common';
import { loadSlackAssets, replaceAssetBlocks } from './slack_assets';
import type { SurfaceRenderer } from './types';

/** Prefix of the placeholder refs this surface's `image` blocks carry. */
export const SLACK_ASSET_PREFIX = 'kibana';

/**
 * Renders the response message as Block Kit, for Slack.
 *
 * When the poster uploads assets, each node the runtime turns into an `image` block, such as an
 * `image`, gets its file from its node type's asset source, and ships with the payload for the
 * poster to upload. A file that can't be loaded, or doesn't fit the payload, renders as the node
 * would without uploads, such as an image's name.
 */
export const slackSurface: SurfaceRenderer = {
  id: ConversationOriginType.Slack,
  render: async (composition, { runtime, context, assets, assetSources, logger, baseUrl }) => {
    const slack = runtime.surfaces.slack;
    // Kibana app links resolve against it; `actions` take absolute URLs only.
    const links = baseUrl ? { baseUrl } : {};

    if (!assets) {
      const { text, blocks } = slack.render(composition, { heading: false, ...links });
      return { text, blocks };
    }

    const {
      text,
      blocks,
      assets: requests,
    } = slack.render(composition, {
      heading: false,
      ...links,
      collectAssets: true,
      assetPrefix: SLACK_ASSET_PREFIX,
    });

    if (requests.length === 0) {
      return { text, blocks };
    }

    // The node as it renders without uploads: what the poster shows if an upload fails.
    const fallbackBlocks = (node: (typeof requests)[number]['node']) =>
      slack.renderNode(node).blocks;

    const { loaded, failed } = await loadSlackAssets({
      requests,
      sources: assetSources,
      context,
      logger,
    });

    const payloadAssets = loaded.map(
      ({ ref, node, altText, file }): SlackPayloadAsset => ({
        ref,
        data: file.data.toString('base64'),
        mime_type: file.mimeType,
        filename: file.filename,
        alt_text: altText,
        fallback_blocks: fallbackBlocks(node),
      })
    );

    return {
      text,
      blocks: replaceAssetBlocks(
        blocks,
        new Map(failed.map(({ ref, node }) => [ref, fallbackBlocks(node)]))
      ),
      ...(payloadAssets.length > 0 ? { assets: payloadAssets } : {}),
    };
  },
};
