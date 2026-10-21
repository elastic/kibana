/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationOriginType, SurfacePayload } from '@kbn/agent-builder-common';
import type { SurfaceComposition } from '@kbn/agent-builder-server/attachments';
import type { KibanaIsomerRuntime } from '@kbn/isomer-plugin/server';

/** What a surface renderer gets from the round, beyond the composition. */
export interface SurfaceRenderOptions {
  /**
   * The Kibana URL of the round's space, which Kibana app links resolve against. Undefined when
   * none can be resolved, and those links are left out.
   */
  baseUrl?: string;
}

/** Renders the response message for the surface rounds from one origin type came from. */
export interface SurfaceRenderer {
  /** Origin type whose rounds this surface renders. */
  id: ConversationOriginType;
  /** Renders the message's composition, with its attachments resolved, for the surface. */
  render: (
    composition: SurfaceComposition,
    runtime: KibanaIsomerRuntime,
    options: SurfaceRenderOptions
  ) => SurfacePayload;
}
