/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RoundCompleteEvent } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { AttachmentSpecMapping } from '../spec/resolve_spec';

/** What a projection needs to render a round. */
export interface ProjectionContext {
  getMapping: (type: string) => AttachmentSpecMapping | undefined;
  /** Linked from attachments that can't be shown, so they can be seen in Kibana. */
  getConversationUrl: () => string;
  logger: Logger;
}

/** Renders one surface's projection of a `round_complete` event, or nothing when it can't. */
export type RenderProjection<TProjection> = (
  event: RoundCompleteEvent,
  context: ProjectionContext
) => TProjection | undefined;
