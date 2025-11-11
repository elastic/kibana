/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { summaryGeneratorTool } from './summary_generator_tool';

export function registerSummaryTool(toolsSetup: ToolsSetup, logger: Logger): void {
  toolsSetup.register(summaryGeneratorTool());
}
