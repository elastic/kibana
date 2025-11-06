/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/onechat-common';
import type { McpToolTypeDefinition } from '../definitions';

export const getMcpToolType = (): McpToolTypeDefinition => {
  return {
    toolType: ToolType.mcp,
    mcp: true,
  };
};
