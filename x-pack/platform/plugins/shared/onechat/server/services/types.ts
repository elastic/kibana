/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolsService, ToolsServiceSetup, ToolsServiceStart } from './tools';

export interface InternalServices {
  tools: ToolsService;
}

export interface InternalSetupServices {
  tools: ToolsServiceSetup;
}

export interface InternalStartServices {
  tools: ToolsServiceStart;
}
