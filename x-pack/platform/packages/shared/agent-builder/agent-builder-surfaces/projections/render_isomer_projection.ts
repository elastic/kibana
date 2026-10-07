/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationOriginType,
  type OriginIsomerProjection,
  type RoundCompleteEvent,
} from '@kbn/agent-builder-common';
import { renderSlackProjection } from '../slack/render_slack_projection';
import type { ProjectionContext, RenderProjection } from './types';

/** Renders the projection of rounds from each origin type. */
const renderers: {
  [TOrigin in keyof OriginIsomerProjection]-?: RenderProjection<
    NonNullable<OriginIsomerProjection[TOrigin]>
  >;
} = {
  [ConversationOriginType.Slack]: renderSlackProjection,
};

/**
 * Renders the projection of the round's origin through Isomer. Returns nothing when the origin
 * has no projection, or it can't be rendered.
 */
export const renderIsomerProjection = (
  event: RoundCompleteEvent,
  { originType, ...context }: ProjectionContext & { originType?: ConversationOriginType }
): OriginIsomerProjection | undefined => {
  if (!originType) {
    return;
  }

  const projection = renderers[originType](event, context);

  return projection && { [originType]: projection };
};
