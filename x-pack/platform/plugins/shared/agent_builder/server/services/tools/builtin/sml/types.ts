/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlService } from '../../../sml';

/**
 * Options for creating SML tools.
 * Uses a getter for lazy resolution — the SML service start contract
 * is not available until after plugin start.
 */
export interface SmlToolsOptions {
  /** Lazy getter for the SML service (resolved at handler invocation time). */
  getSmlService: () => SmlService;
}
