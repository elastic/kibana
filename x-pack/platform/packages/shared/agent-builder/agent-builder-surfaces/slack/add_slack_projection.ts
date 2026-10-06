/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSlackEnvelope } from '@elastic/isomer-sdk/slack';
import {
  ConversationOriginType,
  isRoundCompleteEvent,
  type ChatEvent,
  type RoundCompleteEvent,
  type SlackPayload,
} from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import { specDispatcher } from '../spec/pack';
import { replyToSpec, stripAttachmentTags } from '../spec/reply_to_spec';

export interface AddSlackProjectionOptions {
  /** Type of the round's origin; only Slack rounds get a projection. */
  originType?: ConversationOriginType;
  logger: Logger;
}

const renderSlackPayload = (
  { data: { round } }: RoundCompleteEvent,
  { logger }: AddSlackProjectionOptions
): SlackPayload | undefined => {
  const { message } = round.response;

  try {
    const spec = replyToSpec(message);
    if (!spec) {
      return;
    }

    const { text, blocks } = renderSlackEnvelope(spec, specDispatcher, { heading: false });

    return { text, blocks };
  } catch (error) {
    logger.warn(
      `Failed to render the reply as Block Kit, sending it as markdown: ${error.message}`
    );

    const text = stripAttachmentTags(message);
    return text ? { text, blocks: [{ type: 'markdown', text }] } : undefined;
  }
};

/**
 * Adds the reply, rendered as Block Kit through Isomer, as the Slack payload of `round_complete`
 * events of Slack rounds. Returns `undefined` when the event is left unchanged.
 */
export const addSlackProjection = <TEvent extends ChatEvent>(
  event: TEvent,
  options: AddSlackProjectionOptions
): TEvent | undefined => {
  if (options.originType !== ConversationOriginType.Slack || !isRoundCompleteEvent(event)) {
    return;
  }

  const slack = renderSlackPayload(event, options);
  if (!slack) {
    return;
  }

  return { ...event, projection: { ...event.projection, slack } };
};
