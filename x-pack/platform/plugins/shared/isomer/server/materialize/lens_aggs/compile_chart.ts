/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { i18n } from '@kbn/i18n';
import type { LensApiConfig, LensAttributes } from '@kbn/lens-embeddable-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { CompiledLensLayer } from './compile_layer';
import { UnsupportedLensColumnError, compileLensLayer } from './compile_layer';

/** One form-based layer of a Lens chart: its request, or why it can't be compiled yet. */
export type LensDataViewLayer = { layerId: string } & (
  | { compiled: CompiledLensLayer }
  | { unsupported: string }
);

/** The reference Lens names for a form-based layer's data view. */
const layerReferenceName = (layerId: string) => `indexpattern-datasource-layer-${layerId}`;

/** The layer's saved data view ID, or its ad hoc data view's spec. */
const layerDataView = (
  { references = [], state: { internalReferences = [], adHocDataViews = {} } }: LensAttributes,
  layerId: string
): string | DataViewSpec | undefined => {
  const name = layerReferenceName(layerId);
  const saved = references.find((reference) => reference.name === name);
  if (saved) {
    return saved.id;
  }
  const adHoc = internalReferences.find((reference) => reference.name === name);
  return adHoc ? adHocDataViews[adHoc.id] : undefined;
};

const noDataView = () =>
  i18n.translate('xpack.isomer.materialize.lensAggs.noDataView', {
    defaultMessage: 'This Lens layer names no data view.',
  });

/** A Lens chart in the API format as the Lens attributes Lens itself would save for it. */
export const toLensAttributes = (chart: LensApiConfig): LensAttributes =>
  new LensConfigBuilder(undefined, true).fromAPIFormat(chart);

/**
 * The `aggs` request each form-based layer of a data-view Lens chart runs, keyed by Lens's layer
 * ID, in Lens's layer order. The chart goes through Lens's own API format transform to the layers
 * Lens would save, so columns, defaults and IDs are Lens's; each layer then compiles as Lens's
 * `toExpression` compiles it. Layers without columns are left out.
 */
export const compileLensDataViewChart = (chart: LensApiConfig): LensDataViewLayer[] => {
  const attributes = toLensAttributes(chart);
  const layers = attributes.state.datasourceStates.formBased?.layers ?? {};
  return Object.entries(layers).flatMap(([layerId, layer]): LensDataViewLayer[] => {
    const dataView = layerDataView(attributes, layerId);
    if (!dataView) {
      return [{ layerId, unsupported: noDataView() }];
    }
    try {
      const compiled = compileLensLayer(layer, dataView);
      return compiled ? [{ layerId, compiled }] : [];
    } catch (error) {
      if (error instanceof UnsupportedLensColumnError) {
        return [{ layerId, unsupported: error.message }];
      }
      throw error;
    }
  });
};
