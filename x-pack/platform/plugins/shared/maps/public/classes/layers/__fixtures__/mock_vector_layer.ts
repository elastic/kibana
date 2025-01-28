/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IVectorLayer } from '../vector_layer';

// mock IVectorLayer that passes isVectorLayer type guard
export const mockVectorLayer = {
  addFeature: () => {},
  canShowTooltip: () => {},
  deleteFeature: () => {},
  getFields: () => {},
  getJoins: () => {},
  getLeftJoinFields: () => {},
  getMbTooltipLayerIds: () => {},
  getValidJoins: () => {},
  hasJoins: () => {},
  supportsFeatureEditing: () => {},
} as unknown as IVectorLayer;
