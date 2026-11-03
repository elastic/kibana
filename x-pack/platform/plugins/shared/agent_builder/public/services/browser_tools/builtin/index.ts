/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolDefinition } from '@kbn/agent-builder-browser';
import type { BuiltinToolDeps } from './types';
import { createGetPageSnapshotTool } from './get_page_snapshot';
import { createTakeScreenshotTool } from './take_screenshot';
import { createClickElementTool } from './click_element';
import { createFillFormTool } from './fill_form';
import { createNavigateToTool } from './navigate_to';

export const createBuiltinBrowserTools = (
  deps: BuiltinToolDeps
): Array<BrowserToolDefinition<any>> => [
  createGetPageSnapshotTool(deps),
  createTakeScreenshotTool(),
  createClickElementTool(deps),
  createFillFormTool(deps),
  createNavigateToTool(deps),
];
