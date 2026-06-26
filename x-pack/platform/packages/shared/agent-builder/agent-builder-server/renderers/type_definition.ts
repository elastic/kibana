/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';

/**
 * Server-side definition of a renderer type.
 *
 * Correlated with its browser-side {@link RendererUIDefinition} (and the
 * `<render type="…" />` directive) by the `type` field.
 */
export interface RendererTypeDefinition<
  TType extends string = string,
  TSchema extends ZodObject<any> = ZodObject<any>
> {
  /**
   * Unique identifier for the renderer type to register.
   */
  type: TType;
  /**
   * Zod schema that an agent-produced payload of this type is validated against
   * (browser-side, on render resolution).
   */
  payloadSchema: TSchema;
  /**
   * Optional description of the renderer type, exposed to the agent so it can
   * produce valid payloads and emit the `<render>` directive.
   */
  getAgentDescription?: () => string;
}
