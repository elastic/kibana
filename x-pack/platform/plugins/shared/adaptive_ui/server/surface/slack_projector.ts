/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { renderSlack, validateView } from '@kbn/adaptive-ui';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type {
  AgentBuilderPluginSetup,
  SurfaceProjectorDefinition,
} from '@kbn/agent-builder-server';
import { getKibanaPublicUrl, type KibanaPublicUrlHttp } from '../kibana_public_url';
import { projectReplyToMarkdown } from './project_reply';
import { composeReplyViewSpec } from './compose_reply';

/**
 * Renders the reply to Block Kit, or `undefined` when it cannot be rendered safely.
 *
 * Charts are rendered in their text form rather than with `collectAssets`: a collected
 * asset is a placeholder `slack_file` ref that only becomes postable after a PNG upload,
 * and the Relay-side Slack app has no `files:write` scope to perform one. Emitting refs
 * nothing can resolve would cost the whole message.
 *
 * Invalid blocks are worse than absent blocks — Relay replaces a message Slack rejects
 * with a canned notice — so the spec is validated before it is offered.
 */
const renderBlocks = ({
  spec,
  logger,
}: {
  spec: ReturnType<typeof composeReplyViewSpec>;
  logger?: Logger;
}): unknown[] | undefined => {
  try {
    const validation = validateView(spec);

    if (!validation.valid) {
      logger?.debug('Composed Slack reply did not validate, delivering markdown only');

      return undefined;
    }

    const { blocks } = renderSlack(spec);

    return blocks.length > 0 ? blocks : undefined;
  } catch (error) {
    logger?.debug(`Slack Block Kit projection failed, delivering markdown only: ${error.message}`);

    return undefined;
  }
};

/**
 * Projects Agent Builder replies bound for Slack.
 *
 * `message` is the projection Relay renders today: it posts `response.message` as a
 * markdown block, so substituting the render tags there reaches Slack with no Relay
 * change. `blocks` is the richer projection of the same composition, and stays inert
 * until Relay prefers it over the markdown wrap.
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

    return {
      message: projectReplyToMarkdown(composeArgs),
      blocks: renderBlocks({ spec: composeReplyViewSpec(composeArgs), logger }),
    };
  },
});

export const registerSlackSurfaceProjector = (
  agentBuilder: AgentBuilderPluginSetup,
  deps: { http: KibanaPublicUrlHttp; logger?: Logger }
): void => {
  agentBuilder.surfaceProjection.register(createSlackSurfaceProjector(deps));
};
