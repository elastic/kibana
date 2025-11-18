/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolType } from '@kbn/agent-builder-common';

export interface ToolTypeInfo {
  /**
   * The type of the tool.
   */
  type: ToolType;
  /**
   * If the tool can be created in the UI.
   */
  create: boolean;
}
