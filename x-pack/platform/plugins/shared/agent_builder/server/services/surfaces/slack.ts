/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSlackEnvelope } from '@elastic/isomer-sdk/slack';
import { ConversationOriginType } from '@kbn/agent-builder-common';
import { compositionDispatcher } from './pack';
import type { SurfaceRenderer } from './types';

/** Renders the response message as Block Kit, for Slack. */
export const slackSurface: SurfaceRenderer = {
  id: ConversationOriginType.Slack,
  render: (composition) => {
    const { text, blocks } = renderSlackEnvelope(composition, compositionDispatcher, {
      heading: false,
    });

    return { text, blocks };
  },
};
