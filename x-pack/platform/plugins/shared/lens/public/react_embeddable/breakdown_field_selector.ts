/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { FormBasedLayer } from '@kbn/lens-common';
import { getAvailableOperationsByMetadata } from '../datasources/form_based/operations/operations';
import { replaceColumn } from '../datasources/form_based/operations/layer_helpers';
import { getBreakdownLayerInfo } from './breakdown_field_name';

const isBucketed = (op: { isBucketed?: boolean }) => op.isBucketed === true;

export interface BreakdownFieldOption {
  value: string;
  label: string;
}

/**
 * Returns the list of field names suitable for the breakdown dimension (bucketed operations),
 * e.g. for the Smart Title field selector popover.
 */
export async function getBreakdownFieldOptions(
  attributes: { state?: unknown },
  dataViews: DataViewsPublicPluginStart
): Promise<BreakdownFieldOption[]> {
  const info = getBreakdownLayerInfo(attributes);
  if (!info) return [];

  try {
    const dataView = await dataViews.get(info.indexPatternId);
    if (!dataView?.fields) return [];

    const operationsByMetadata = getAvailableOperationsByMetadata(
      dataView as unknown as Parameters<typeof getAvailableOperationsByMetadata>[0]
    );
    const bucketedFields = new Map<string, string>();
    for (const { operationMetaData, operations } of operationsByMetadata) {
      if (!isBucketed(operationMetaData)) continue;
      for (const op of operations) {
        if (op.type === 'field') {
          const field = dataView.getFieldByName(op.field);
          const label = field?.displayName ?? field?.name ?? op.field;
          bucketedFields.set(op.field, label);
        }
      }
    }
    return Array.from(bucketedFields.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([value, label]) => ({ value, label }));
  } catch {
    return [];
  }
}

/**
 * Updates the Lens attributes so the breakdown dimension uses the given field (terms aggregation).
 * Returns the new attributes or the same if the change could not be applied.
 */
export async function setBreakdownField<T extends { state?: unknown }>(
  attributes: T,
  fieldName: string,
  dataViews: DataViewsPublicPluginStart
): Promise<T> {
  const info = getBreakdownLayerInfo(attributes);
  if (!info) return attributes;

  const state = attributes?.state as Record<string, unknown> | undefined;
  const dsStates = state?.datasourceStates as Record<string, { layers?: Record<string, FormBasedLayer> }> | undefined;
  const formBased = dsStates?.formBased ?? dsStates?.indexpattern;
  const layers = formBased?.layers;
  const rawLayer = layers?.[info.layerId];
  if (!rawLayer) return attributes;

  try {
    const dataView = await dataViews.get(info.indexPatternId);
    const field = dataView?.getFieldByName(fieldName);
    if (!dataView || !field) return attributes;

    const layer: FormBasedLayer = {
      ...rawLayer,
      indexPatternId: rawLayer.indexPatternId ?? info.indexPatternId,
    };

    const newLayer = replaceColumn({
      layer,
      columnId: info.columnId,
      indexPattern: dataView as unknown as Parameters<typeof replaceColumn>[0]['indexPattern'],
      op: 'terms',
      field: field as unknown as Parameters<typeof replaceColumn>[0]['field'],
      visualizationGroups: [],
    });

    const newLayers = { ...layers, [info.layerId]: newLayer };
    const newFormBased = { ...formBased, layers: newLayers };
    const newDsStates = { ...dsStates, formBased: newFormBased };
    const newState = { ...state, datasourceStates: newDsStates };
    return { ...attributes, state: newState };
  } catch {
    return attributes;
  }
}
