/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { AbstractLayer } from './layer';
import { VectorLayer } from './vector_layer';
import { HeatmapStyle } from './styles/heatmap_style';

const SCALED_PROPERTY_NAME = '__kbn_heatmap_weight__';//unique name to store scaled value for weighting

export class HeatmapLayer extends VectorLayer {

  static type = 'HEATMAP';

  static createDescriptor(options) {
    const heatmapLayerDescriptor = super.createDescriptor(options);
    heatmapLayerDescriptor.type = HeatmapLayer.type;
    heatmapLayerDescriptor.style = HeatmapStyle.createDescriptor();
    return heatmapLayerDescriptor;
  }

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
    if (!style) {
      const defaultStyle = HeatmapStyle.createDescriptor();
      this._style = new HeatmapStyle(defaultStyle);
    }
  }

  _getPropKeyOfSelectedMetric() {
    const metricfields = this._source.getMetricFields();
    return metricfields[0].propertyKey;
  }

  _getMbLayerId() {
    return this.getId() + '_heatmap';
  }

  getMbLayerIds() {
    return [this._getMbLayerId()];
  }

  syncLayerWithMB(mbMap) {
    const mbSource = mbMap.getSource(this.getId());
    const mbLayerId = this._getMbLayerId();

    if (!mbSource) {
      mbMap.addSource(this.getId(), {
        type: 'geojson',
        data: { 'type': 'FeatureCollection', 'features': [] }
      });

      mbMap.addLayer({
        id: mbLayerId,
        type: 'heatmap',
        source: this.getId(),
        paint: {}
      });
    }

    const mbSourceAfter = mbMap.getSource(this.getId());
    const sourceDataRequest = this.getSourceDataRequest();
    const featureCollection = sourceDataRequest ? sourceDataRequest.getData() : null;
    if (!featureCollection) {
      mbSourceAfter.setData({ 'type': 'FeatureCollection', 'features': [] });
      return;
    }

    const propertyKey = this._getPropKeyOfSelectedMetric();
    const dataBoundToMap = AbstractLayer.getBoundDataForSource(mbMap, this.getId());
    if (featureCollection !== dataBoundToMap) {
      let max = 0;
      for (let i = 0; i < featureCollection.features.length; i++) {
        max = Math.max(featureCollection.features[i].properties[propertyKey], max);
      }
      for (let i = 0; i < featureCollection.features.length; i++) {
        featureCollection.features[i].properties[SCALED_PROPERTY_NAME] = featureCollection.features[i].properties[propertyKey] / max;
      }
      mbSourceAfter.setData(featureCollection);
    }

    mbMap.setLayoutProperty(mbLayerId, 'visibility', this.isVisible() ? 'visible' : 'none');
    this._style.setMBPaintProperties({
      mbMap,
      layerId: mbLayerId,
      propertyName: SCALED_PROPERTY_NAME,
      resolution: this._source.getGridResolution()
    });
    mbMap.setPaintProperty(mbLayerId, 'heatmap-opacity', this.getAlpha());
    mbMap.setLayerZoomRange(mbLayerId, this._descriptor.minZoom, this._descriptor.maxZoom);
  }

  getLayerTypeIconName() {
    return 'heatmap';
  }

  hasLegendDetails() {
    return true;
  }

  getLegendDetails() {
    const label = _.get(this._source.getMetricFields(), '[0].propertyLabel', '');
    return this._style.getLegendDetails(label);
  }
}
