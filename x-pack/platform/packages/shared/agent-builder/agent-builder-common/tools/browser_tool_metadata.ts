/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonSchema7Type } from 'zod-to-json-schema';

/**
 * Browser API tool metadata that can be transmitted between browser and server.
 *
 * This represents a browser-side tool definition in a serializable format.
 * Handlers are not serializable, so they are excluded from this metadata type.
 *
 * @public
 */
export interface BrowserApiToolMetadata {
  /**
   * Unique identifier for the tool.
   * Must use underscores (not dots) to comply with OpenAI API requirements.
   * Should follow naming convention: consumer_domain_action
   * Example: 'set_time_range', 'update_filters'
   */
  id: string;

  /**
   * Description of what the tool does.
   * This is provided to the LLM to help it understand when and how to use the tool.
   */
  description: string;

  /**
   * JSON Schema representation of the tool's parameters.
   * Generated from the tool's Zod schema.
   */
  schema: JsonSchema7Type;
}
