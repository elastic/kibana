/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TileLayer } from './tile_layer';
import _ from 'lodash';
import { TileStyle } from '../layers/styles/tile_style';
import { styleTest } from './style_test';
import { SOURCE_DATA_ID_ORIGIN } from '../../common/constants';

window._styleTest = styleTest;

const layersToInclude = styleTest.layers.filter((layer, index) => {
  const whiteList = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51,
    51,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,
    70,
    71,
    72,
    73,
    74,
    75,
    76,
    77,
    78,
    79,
    80,
    81,
    82,
    83,
    84,
    85,
    86,
    87,

    88,
    89,
    90,

    91,
    92,
    93,
    94,
    95,
    96,

    97,
    98,
    99,

    100,
    101,
    102,
    103,
    104,

    105,
    106,
    107,
    108,
    109,
    110
  ].includes(index);
  return whiteList;
});


// console.log('layers to include', layersToInclude);

export class VectorTileLayer extends TileLayer {

  static type = 'VECTOR_TILE';

  constructor({ layerDescriptor, source, style }) {
    super({ layerDescriptor, source, style });
  }

  static createDescriptor(options) {
    const tileLayerDescriptor = super.createDescriptor(options);
    tileLayerDescriptor.type = VectorTileLayer.type;
    tileLayerDescriptor.alpha = _.get(options, 'alpha', 1);
    tileLayerDescriptor.style =
      TileStyle.createDescriptor(tileLayerDescriptor.style.properties);
    return tileLayerDescriptor;
  }

  _generateMbLayerId(mbLayer) {
    const escaped = mbLayer.id.replace(/_/g, '');//work-around issue bug
    return this._getMbSourceId() + '_' + escaped;
  }

  getMbLayerIds() {
    const layerIds = layersToInclude.map(layer => {
      return this._generateMbLayerId(layer);
    });
    return layerIds;
  }

  _getMbSourceId() {
    return this.getId();
  }

  async syncData({ startLoading, stopLoading, onLoadError, dataFilters }) {
    if (!this.isVisible() || !this.showAtZoomLevel(dataFilters.zoom)) {
      return;
    }
    const sourceDataRequest = this.getSourceDataRequest();
    if (sourceDataRequest) {//data is immmutable
      return;
    }
    const requestToken = Symbol(`layer-source-refresh:${ this.getId()} - source`);
    startLoading(SOURCE_DATA_ID_ORIGIN, requestToken, dataFilters);
    try {
      const vectorStyle = await this._source.getVectorStyle();
      console.log('vsr', vectorStyle);
      stopLoading(SOURCE_DATA_ID_ORIGIN, requestToken, vectorStyle, {});
    } catch(error) {
      onLoadError(SOURCE_DATA_ID_ORIGIN, requestToken, error.message);
    }
  }

  syncLayerWithMB(mbMap) {
    // console.log('synclyaer');
    // this.super(mbMap);

    const sourceId = this._getMbSourceId();
    const source = mbMap.getSource(sourceId);

    if (!source) {


      const sourceDataRequest = this.getSourceDataRequest();
      if (!sourceDataRequest) {
        //this is possible if the layer was invisible at startup.
        //the actions will not perform any data=syncing as an optimization when a layer is invisible
        //when turning the layer back into visible, it's possible the url has not been resovled yet.
        return;
      }
      const vectorStyle = sourceDataRequest.getData();
      if (!vectorStyle) {
        return;
      }

      console.log('vs', vectorStyle);
      // debugger;

      //assume single source
      const sourceIds = Object.keys(vectorStyle.sources);
      const firstSourceName = sourceIds[0];

      mbMap.addSource(sourceId, {
        type: 'vector',
        url: vectorStyle.sources[firstSourceName].url
      });

      vectorStyle.layers.forEach(layer => {

        if (layer.source !== firstSourceName) {
          return;
        }

        const newLayerObject = {
          ...layer,
          source: this._getMbSourceId(),
          id: this._generateMbLayerId(layer)
        };
        try {
          mbMap.addLayer(newLayerObject);
        } catch(e){
          console.error(e);
        }
      });

      console.log('done syncing!');
    }

  }

}
