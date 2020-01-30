/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchSource } from '../es_search_source';
import {
  ES_MVT_SEARCH,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
  ES_GEO_FIELD_TYPE,
} from '../../../../common/constants';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import uuid from 'uuid/v4';
import { CreateSourceEditor } from '../es_search_source/create_source_editor';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { loadIndexSettings } from '../es_search_source/load_index_settings';
import rison from 'rison-node';
import { UpdateSourceEditor } from '../es_search_source/update_source_editor';
import {ESGeoGridSource} from "../es_geo_grid_source";

export class ESMVTGeoGridSource extends ESGeoGridSource {
  static type = ES_MVT_SEARCH;
  static title = i18n.translate('xpack.maps.source.esMvtSearchTitle', {
    defaultMessage: 'Documents as tiles',
  });
  static description = i18n.translate('xpack.maps.source.esMvtSearchDescription', {
    defaultMessage: 'Vector data from a Kibana index pattern (tiled)',
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    return null;
  }

  async getUrlTemplate(searchFilters) {
    return null;
  }

  getMvtSourceLayer() {
    return 'geojsonLayer';
  }

  isTileSource() {
    return true;
  }

  _createDefaultLayerDescriptor(options) {
    const tvl = TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });

    return tvl;
  }

  renderSourceSettingsEditor({ onChange }) {
    return null;
  }

  isFilterByMapBounds() {
    return false;
  }

  isFilterByMapBoundsConfigurable() {
    return false;
  }

  isBoundsAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isJoinable() {
    return false;
  }

  async getImmutableProperties() {
    const ip = await super.getImmutableProperties();
    ip.push({
      label: i18n.translate('xpack.maps.source.esSearch.isMvt', {
        defaultMessage: 'Is MBVT?',
      }),
      value: 'yes is mvt',
    });
    return ip;
  }
}
