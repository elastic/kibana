/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OriginIsomerProjection } from '@kbn/agent-builder-common';
import type { Spec } from './pack';

/** Renders the projection of rounds from one origin type through Isomer. */
export interface IsomerProjectionRenderer<
  TOrigin extends keyof OriginIsomerProjection = keyof OriginIsomerProjection
> {
  /** Origin type whose rounds get this projection. */
  id: TOrigin;
  /** Renders the message's spec, with its attachments resolved, for the surface. */
  render: (spec: Spec) => NonNullable<OriginIsomerProjection[TOrigin]>;
}
