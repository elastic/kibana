/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { renderSlack, validateView, type SlackRenderResult } from '@kbn/adaptive-ui';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type {
  AgentBuilderPluginSetup,
  SurfaceProjection,
  SurfaceProjectionAsset,
  SurfaceProjectorDefinition,
} from '@kbn/agent-builder-server';
import { getKibanaPublicUrl, type KibanaPublicUrlHttp } from '../kibana_public_url';
import { projectReplyToMarkdown } from './project_reply';
import { composeReplyViewSpec } from './compose_reply';

type SlackAssetRequest = SlackRenderResult['assets'][number];

/**
 * Ceiling on chart bytes one projection may carry. Base64 inflates these ~4/3 into a
 * callback body that is otherwise small JSON, so a chart-heavy view degrades to its text
 * form rather than pushing a multi-megabyte payload through the callback.
 */
const MAX_PROJECTION_ASSET_BYTES = 2 * 1024 * 1024;

/**
 * Rasterizes each collected chart, or `undefined` if any fails or the set exceeds
 * {@link MAX_PROJECTION_ASSET_BYTES}. All-or-nothing: a ref left unresolved fails the
 * whole Slack message, so a partial set is worth less than none.
 */
const renderChartAssets = async (
  requests: readonly SlackAssetRequest[],
  logger?: Logger
): Promise<SurfaceProjectionAsset[] | undefined> => {
  // `@kbn/adaptive-ui/node` pulls in native `@takumi-rs/core`; a reply with no
  // chart should never load the renderer.
  const assets: SurfaceProjectionAsset[] = [];
  let totalBytes = 0;

  try {
    const { renderNodePng } = await import('../slack/render_png');

    for (const { ref, node, altText } of requests) {
      const png = await renderNodePng(node);
      totalBytes += png.byteLength;

      if (totalBytes > MAX_PROJECTION_ASSET_BYTES) {
        logger?.debug(
          `Slack chart assets exceeded ${MAX_PROJECTION_ASSET_BYTES} bytes, rendering charts as text`
        );

        return undefined;
      }

      assets.push({ ref, png, altText });
    }
  } catch (error) {
    logger?.debug(`Slack chart rasterization failed, rendering charts as text: ${error.message}`);

    return undefined;
  }

  return assets;
};

/**
 * Renders the reply to Block Kit, or `undefined` when it cannot be rendered safely.
 *
 * Slack has no chart block, so charts render as `image` blocks holding a placeholder
 * `slack_file` ref. Kibana rasterizes each one but cannot upload it — only the host holds
 * the Slack credential — so the PNGs travel with the blocks and the host resolves the
 * refs. If rasterizing fails, the spec is re-rendered without asset collection so charts
 * degrade to their text form instead of leaving refs nothing can resolve.
 *
 * Invalid blocks are worse than absent blocks — Relay replaces a message Slack rejects
 * with a canned notice — so the spec is validated before it is offered.
 */
const renderBlocks = async ({
  spec,
  logger,
}: {
  spec: ReturnType<typeof composeReplyViewSpec>;
  logger?: Logger;
}): Promise<Pick<SurfaceProjection, 'blocks' | 'assets'> | undefined> => {
  try {
    const validation = validateView(spec);

    if (!validation.valid) {
      logger?.debug('Composed Slack reply did not validate, delivering markdown only');

      return undefined;
    }

    const rendered = renderSlack(spec, { collectAssets: true });

    if (rendered.blocks.length === 0) {
      return undefined;
    }

    if (rendered.assets.length === 0) {
      return { blocks: rendered.blocks };
    }

    const assets = await renderChartAssets(rendered.assets, logger);

    if (assets) {
      return { blocks: rendered.blocks, assets };
    }

    const textOnly = renderSlack(spec);

    return textOnly.blocks.length > 0 ? { blocks: textOnly.blocks } : undefined;
  } catch (error) {
    logger?.debug(`Slack Block Kit projection failed, delivering markdown only: ${error.message}`);

    return undefined;
  }
};

/**
 * Projects Agent Builder replies bound for Slack.
 *
 * `message` carries the whole answer as markdown, so a host that ignores everything else
 * still posts it in full. `blocks` is the richer projection of the same composition, and
 * `assets` holds the chart PNGs its `image` blocks reference by placeholder ref.
 */
export const createSlackSurfaceProjector = ({
  http,
  logger,
}: {
  http: KibanaPublicUrlHttp;
  logger?: Logger;
}): SurfaceProjectorDefinition => ({
  surface: ConversationOriginType.Slack,
  project: async ({ message, attachments, attachmentRefs, spaceId }) => {
    const kibanaUrl = getKibanaPublicUrl({ http, spaceId });
    const composeArgs = { message, attachments, attachmentRefs, kibanaUrl, logger };
    const rendered = await renderBlocks({ spec: composeReplyViewSpec(composeArgs), logger });

    return {
      message: projectReplyToMarkdown(composeArgs),
      ...rendered,
    };
  },
});

export const registerSlackSurfaceProjector = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: { http: KibanaPublicUrlHttp; logger?: Logger }
): void => {
  agentBuilder.surfaceProjection.register(createSlackSurfaceProjector(deps));
};
