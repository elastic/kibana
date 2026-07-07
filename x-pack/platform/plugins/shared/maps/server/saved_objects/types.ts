/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';

/**
 * Shape of map attributes stored in saved object
 *
 * Values stored as stringified JSON to be consistent
 * with other saved objects at the time (around 2018).
 */
export type StoredMapAttributes = SerializableRecord & {
  title: string;
  description?: string;
  mapStateJSON?: string;
  layerListJSON?: string;
  uiStateJSON?: string;
};

export interface StoredRefreshInterval {
  isPaused: boolean;
  interval: number;
}
