/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensAPIConfig, LensItem } from '../../server/content_management';

export function isNewApiFormat(config: unknown): config is LensAPIConfig {
  return (config as LensAPIConfig)?.state?.isNewApiFormat;
}

export const ConfigBuilderStub = {
  /**
   * @returns Lens item
   */
  in(config: LensAPIConfig): LensItem {
    const { isNewApiFormat: _, ...cleanedState } = config.state;
    return {
      ...config,
      state: cleanedState,
    };
  },

  /**
   * @returns Lens API config
   */
  out(item: LensItem): LensAPIConfig {
    return {
      ...item,
      state: {
        ...item.state,
        isNewApiFormat: true,
      },
    };
  },
};
