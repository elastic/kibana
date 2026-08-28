/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginSetup, SurfaceProjectorDefinition } from '@kbn/agent-builder-server';
import { projectReplyToMarkdown } from './project_reply';

/**
 * Projects Agent Builder replies bound for Slack.
 *
 * Slack is reached through Relay, which posts `response.message` as markdown, so this
 * projection lands inside that string. Richer Block Kit output is the same composition
 * through `renderSlack`, and needs a Relay-side contract to carry it.
 */
export const slackSurfaceProjector: SurfaceProjectorDefinition = {
  surface: ConversationOriginType.Slack,
  project: async ({ message, attachments, attachmentRefs }) => ({
    message: projectReplyToMarkdown({ message, attachments, attachmentRefs }),
  }),
};

export const registerSlackSurfaceProjector = (agentBuilder: AgentBuilderPluginSetup): void => {
  agentBuilder.surfaceProjection.register(slackSurfaceProjector);
};
