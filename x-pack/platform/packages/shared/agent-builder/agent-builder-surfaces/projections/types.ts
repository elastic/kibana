/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginIsomerProjection, RoundCompleteEvent } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { AttachmentSpecMapping } from '../spec/resolve_spec';

/** What a projection needs to render a round. */
export interface ProjectionContext {
  getMapping: (type: string) => AttachmentSpecMapping | undefined;
  /** Linked from attachments that can't be shown, so they can be seen in Kibana. */
  getConversationUrl: () => string;
  logger: Logger;
}

/** The projection of rounds from one origin type, rendered through Isomer. */
export interface IsomerProjectionDefinition<
  TOrigin extends keyof OriginIsomerProjection = keyof OriginIsomerProjection
> {
  /** Origin type whose rounds get this projection. */
  id: TOrigin;
  /** Renders the projection of a `round_complete` event, or nothing when it can't. */
  render: (
    event: RoundCompleteEvent,
    context: ProjectionContext
  ) => OriginIsomerProjection[TOrigin];
}
