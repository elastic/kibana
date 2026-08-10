/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayerDescriptor, RuntimeLayerState } from '../../common/descriptor_types';

export function getRuntimeState(layerDescriptor: LayerDescriptor): RuntimeLayerState {
  const runtimeState: RuntimeLayerState = {};
  for (const key in layerDescriptor) {
    if (key.startsWith('__')) {
      // @ts-ignore
      runtimeState[key] = layerDescriptor[key];
    }
  }
  return runtimeState;
}
