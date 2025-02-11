/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DatasourceLayers } from '../types';

type VisState = { layers: Array<{ layerId: string }> } | { layerId: string };

interface MappedVisualValue {
  truncateText: boolean;
}

function hasSingleLayer(state: VisState): state is Extract<VisState, { layerId: string }> {
  return 'layerId' in state;
}

function mergeValues(memo: MappedVisualValue, values: Partial<MappedVisualValue>, i: number) {
  // first the first entry, overwrite
  if (i === 0) {
    return { ...memo, ...values };
  }
  // after the first give priority to existent value
  return { ...values, ...memo };
}

export function getDefaultVisualValuesForLayer(
  state: VisState | undefined,
  datasourceLayers: DatasourceLayers
): MappedVisualValue {
  const defaultValues = { truncateText: true };
  if (!state) {
    return defaultValues;
  }
  if (hasSingleLayer(state)) {
    return Object.values(
      datasourceLayers[state.layerId]?.getVisualDefaults() || {}
    ).reduce<MappedVisualValue>(mergeValues, defaultValues);
  }
  return state.layers
    .flatMap(({ layerId }) => Object.values(datasourceLayers[layerId]?.getVisualDefaults() || {}))
    .reduce<MappedVisualValue>(mergeValues, defaultValues);
}
