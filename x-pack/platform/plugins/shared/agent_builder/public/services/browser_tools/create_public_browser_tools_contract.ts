/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BrowserToolsServiceStartContract } from '@kbn/agent-builder-browser';
import type { BrowserToolsService } from './browser_tools_service';

export const createPublicBrowserToolsContract = ({
  browserToolsService,
}: {
  browserToolsService: BrowserToolsService;
}): BrowserToolsServiceStartContract => {
  return {
    register: (tool) => {
      return browserToolsService.register(tool);
    },
  };
};
