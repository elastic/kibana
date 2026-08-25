/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RendererTypeDefinition } from '@kbn/agent-builder-server';
import { getViewSpecSchema } from '@kbn/adaptive-ui';
import { ADAPTIVE_UI_VIEW_RENDERER_TYPE } from '../../common/constants';

/**
 * Server-side renderer type for an Adaptive UI `ViewSpec`. The payload it
 * validates is portable: the same object feeds `renderSlack`/`renderMarkdown`
 * off-Kibana. Only the browser side turns it into React.
 */
export const viewRendererTypeDefinition: RendererTypeDefinition = {
  type: ADAPTIVE_UI_VIEW_RENDERER_TYPE,
  payloadSchema: getViewSpecSchema(),
  getAgentDescription: () =>
    'Renders a composed Adaptive UI view. Payload is a ViewSpec: `{ type: "view", title?, subtitle?, body: [statGroup | callout | table | text | ...] }`. Call `get_authoring_context` for the primitive catalog before producing one.',
};
