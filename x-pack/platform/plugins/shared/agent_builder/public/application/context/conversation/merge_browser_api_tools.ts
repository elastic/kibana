/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserApiToolDefinition } from '@kbn/agent-builder-browser/tools/browser_api_tool';

/**
 * Merges plugin-registered browser API tools with the tools an embed host passed as props.
 * Host tools win on id collision. Returns undefined when there is nothing to expose, keeping
 * the "no browser tools" shape the rest of the conversation context expects.
 */
export const mergeBrowserApiTools = (
  registryTools: Array<BrowserApiToolDefinition<any>>,
  hostTools: Array<BrowserApiToolDefinition<any>> | undefined
): Array<BrowserApiToolDefinition<any>> | undefined => {
  const host = hostTools ?? [];
  const merged = [
    ...host,
    ...registryTools.filter((tool) => !host.some((hostTool) => hostTool.id === tool.id)),
  ];
  return merged.length > 0 ? merged : undefined;
};
