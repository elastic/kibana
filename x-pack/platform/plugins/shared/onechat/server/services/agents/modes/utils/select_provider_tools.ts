/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { filterToolsBySelection, ToolSelection } from '@kbn/onechat-common';
import type { ToolProvider, ExecutableTool } from '@kbn/onechat-server';

export const selectProviderTools = async ({
  provider,
  selection,
  request,
}: {
  provider: ToolProvider;
  selection: ToolSelection[];
  request: KibanaRequest;
}): Promise<ExecutableTool[]> => {
  const tools = await provider.list({ request });
  return filterToolsBySelection(tools, selection);
};
