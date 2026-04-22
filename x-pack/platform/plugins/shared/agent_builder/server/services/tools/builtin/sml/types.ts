/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlService } from '@kbn/semantic-layer-plugin/server';
import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

/**
 * Options for creating SML tools.
 * Uses getters for lazy resolution — plugin start contracts
 * are not available until after plugin start.
 */
export interface SmlToolsOptions {
  /** Lazy getter for the SML service (resolved at handler invocation time). */
  getSmlService: () => SmlService;
  /** Find an attachment type definition by its originType key. */
  getAttachmentTypeByOriginType: (originType: string) => AttachmentTypeDefinition | undefined;
}
