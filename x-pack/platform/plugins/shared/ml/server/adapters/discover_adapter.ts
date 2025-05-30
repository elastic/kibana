/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * DiscoverAdapter interface defines the minimal set of functionality that ML needs from the discover plugin
 * This helps break the circular dependency by isolating just what's needed
 */
export interface DiscoverAdapterInterface {
  // Add methods needed from discover plugin
  isAvailable: () => boolean;
}

/**
 * Creates an adapter for the discover plugin that can be used in ML
 * When discover is available, it delegates to it
 * When discover is not available, it provides fallback behavior
 */
export class DiscoverAdapter implements DiscoverAdapterInterface {
  constructor(
    private readonly discoverPlugin: any | undefined,
    private readonly logger: Logger
  ) {}

  /**
   * Check if discover plugin is available
   */
  public isAvailable = (): boolean => {
    return this.discoverPlugin !== undefined;
  };

  // Implement other methods that ML needs from discover
  // Each method should check if discover is available and provide fallback behavior if not
}
