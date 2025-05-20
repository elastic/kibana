/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolDescriptor } from '@kbn/onechat-common';

/**
 * Remove all additional properties from a tool descriptor.
 *
 * Can be used to convert/clean tool registration for public-facing APIs.
 */
export const toolToDescriptor = <T extends ToolDescriptor>(tool: T): ToolDescriptor => {
  const { id, name, description, meta } = tool;
  return { id, name, description, meta };
};
