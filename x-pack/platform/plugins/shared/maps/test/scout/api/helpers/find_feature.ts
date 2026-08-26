/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function findFeature(
  layer: { length: number; feature: (index: number) => any },
  callbackFn: (feature: any) => boolean
) {
  for (let i = 0; i < layer.length; i++) {
    const feature = layer.feature(i);
    if (callbackFn(feature)) {
      return feature;
    }
  }
}
