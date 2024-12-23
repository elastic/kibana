/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AnyAction, Dispatch } from 'redux';
import { connect } from 'react-redux';
import { LayerSettings } from './layer_settings';
import {
  clearLayerAttribution,
  setLayerAttribution,
  updateLayerLabel,
  updateLayerLocale,
  updateLayerMaxZoom,
  updateLayerMinZoom,
  updateLayerAlpha,
  updateLabelsOnTop,
  updateFittableFlag,
  updateDisableTooltips,
} from '../../../actions';
import { Attribution } from '../../../../common/descriptor_types';

function mapDispatchToProps(dispatch: Dispatch<AnyAction>) {
  return {
    clearLayerAttribution: (id: string) => dispatch(clearLayerAttribution(id)),
    setLayerAttribution: (id: string, attribution: Attribution) =>
      dispatch(setLayerAttribution(id, attribution)),
    updateLabel: (id: string, label: string) => dispatch(updateLayerLabel(id, label)),
    updateLocale: (id: string, locale: string) => dispatch(updateLayerLocale(id, locale)),
    updateMinZoom: (id: string, minZoom: number) => dispatch(updateLayerMinZoom(id, minZoom)),
    updateMaxZoom: (id: string, maxZoom: number) => dispatch(updateLayerMaxZoom(id, maxZoom)),
    updateAlpha: (id: string, alpha: number) => dispatch(updateLayerAlpha(id, alpha)),
    updateLabelsOnTop: (id: string, areLabelsOnTop: boolean) =>
      dispatch(updateLabelsOnTop(id, areLabelsOnTop)),
    updateIncludeInFitToBounds: (id: string, includeInFitToBounds: boolean) =>
      dispatch(updateFittableFlag(id, includeInFitToBounds)),
    updateDisableTooltips: (id: string, DisableTooltips: boolean) =>
      dispatch(updateDisableTooltips(id, DisableTooltips)),
  };
}

const connectedLayerSettings = connect(null, mapDispatchToProps)(LayerSettings);
export { connectedLayerSettings as LayerSettings };
