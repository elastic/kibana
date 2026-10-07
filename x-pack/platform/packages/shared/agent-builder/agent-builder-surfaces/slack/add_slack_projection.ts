/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSlackEnvelope } from '@elastic/isomer-sdk/slack';
import type { RoundCompleteEvent, SlackPayload } from '@kbn/agent-builder-common';
import type { AddProjection, ProjectionContext } from '../projections/types';
import { specDispatcher } from '../spec/pack';
import { replyToSpec } from '../spec/reply_to_spec';
import { resolveSpec } from '../spec/resolve_spec';

const renderSlackPayload = (
  { data: { round, attachments = [] } }: RoundCompleteEvent,
  { getMapping, getConversationUrl, logger }: ProjectionContext
): SlackPayload | undefined => {
  const { message } = round.response;

  try {
    const spec = replyToSpec(message);
    if (!spec) {
      return;
    }

    const resolved = resolveSpec(spec, {
      attachments,
      attachmentRefs: round.input.attachment_refs,
      getMapping,
      conversationUrl: getConversationUrl(),
      logger,
    });
    const { text, blocks } = renderSlackEnvelope(resolved, specDispatcher, { heading: false });

    return { text, blocks };
  } catch (error) {
    logger.warn(
      `Failed to render the reply as Block Kit, leaving out its projection: ${error.message}`
    );
  }
};

/**
 * Adds the reply, rendered as Block Kit through Isomer, as the Slack payload of the event.
 * Returns the event unchanged for empty replies, or when rendering fails.
 */
export const addSlackProjection: AddProjection = (event, context) => {
  const slack = renderSlackPayload(event, context);
  if (!slack) {
    return event;
  }

  return { ...event, projection: { ...event.projection, slack } };
};
