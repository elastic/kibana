/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginIsomerProjection } from '@kbn/agent-builder-common';
import type { Logger } from '@kbn/logging';
import type { Spec } from '../spec/pack';
import type { AttachmentSpecMapping } from '../spec/resolve_spec';

/** What a projection needs to render a round. */
export interface ProjectionContext {
  /** Looks up attachment types, whose `toSpec` renders attachments in place of their tags. */
  attachmentsService: {
    getTypeDefinition: (type: string) => { toSpec?: AttachmentSpecMapping } | undefined;
  };
  /** Linked from attachments that can't be shown, so they can be seen in Kibana. */
  conversationUrl: string;
  logger: Logger;
}

/** The projection of rounds from one origin type, rendered through Isomer. */
export interface IsomerProjectionDefinition<
  TOrigin extends keyof OriginIsomerProjection = keyof OriginIsomerProjection
> {
  /** Origin type whose rounds get this projection. */
  id: TOrigin;
  /** Renders the reply's spec, with its attachments resolved, for the surface. */
  render: (spec: Spec) => NonNullable<OriginIsomerProjection[TOrigin]>;
}
