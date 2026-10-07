/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSlackEnvelope } from '@elastic/isomer-sdk/slack';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import type { IsomerProjectionDefinition } from '../projections/types';
import { specDispatcher } from '../spec/pack';

/** Slack projection: the reply rendered as Block Kit. */
export const slackProjection: IsomerProjectionDefinition<ConversationOriginType.Slack> = {
  id: ConversationOriginType.Slack,
  render: (spec) => {
    const { text, blocks } = renderSlackEnvelope(spec, specDispatcher, { heading: false });

    return { text, blocks };
  },
};
