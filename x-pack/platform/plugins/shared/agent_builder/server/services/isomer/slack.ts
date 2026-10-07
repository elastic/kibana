/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSlackEnvelope } from '@elastic/isomer-sdk/slack';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { specDispatcher } from './pack';
import type { IsomerProjectionRenderer } from './types';

/** Renders the Slack projection: the response message as Block Kit. */
export const slackProjectionRenderer: IsomerProjectionRenderer<ConversationOriginType.Slack> = {
  id: ConversationOriginType.Slack,
  render: (spec) => {
    const { text, blocks } = renderSlackEnvelope(spec, specDispatcher, { heading: false });

    return { text, blocks };
  },
};
