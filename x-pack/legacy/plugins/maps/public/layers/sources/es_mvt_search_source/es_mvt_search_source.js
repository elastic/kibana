/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESSearchSource } from '../es_search_source';
import {
  ES_MVT_SEARCH,
  ES_SEARCH,
  GIS_API_PATH,
  MVT_GETTILE_API_PATH,
  SORT_ORDER,
} from '../../../../common/constants';
import { VectorStyle } from '../../styles/vector/vector_style';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import uuid from 'uuid/v4';
import { CreateSourceEditor } from '../es_search_source/create_source_editor';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { VectorLayer } from '../../vector_layer';
import _ from 'lodash';
import { DEFAULT_FILTER_BY_MAP_BOUNDS } from '../es_search_source/constants';
import { getDataSourceLabel } from '../../../../common/i18n_getters';

export class ESMVTSearchSource extends ESSearchSource {
  static type = ES_MVT_SEARCH;
  static title = i18n.translate('xpack.maps.source.esMvtSearchTitle', {
    defaultMessage: 'Documents as tiles',
  });
  static description = i18n.translate('xpack.maps.source.esMvtSearchDescription', {
    defaultMessage: 'Vector data from a Kibana index pattern (tiled)',
  });

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      if (!sourceConfig) {
        onPreviewSource(null);
        return;
      }

      const source = new ESMVTSearchSource(
        {
          id: uuid(),
          ...sourceConfig,
          type: ESMVTSearchSource.type,
        },
        inspectorAdapters
      );

      console.log('create esmvt source', source);
      onPreviewSource(source);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  async getUrlTemplate() {
    console.log('need to get vector template!', this);

    const indexPattern = await this.getIndexPattern();
    const ipTitle = indexPattern.title;
    const geometryFieldBame = this._descriptor.geoField;
    const fields = ['_id'];
    const fieldsParam = fields.join(',');

    return `../${GIS_API_PATH}/${MVT_GETTILE_API_PATH}?x={x}&y={y}&z={z}&geometryFieldName=${geometryFieldBame}&indexPattern=${ipTitle}&fields=${fieldsParam}`;
  }

  getMvtSourceLayer() {
    return 'geojsonLayer';
  }
  _createDefaultLayerDescriptor(options) {
    const tvl = TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });

    console.log('create tiledvectorlayer descriptor');
    return tvl;
  }

  renderSourceSettingsEditor({ onChange }) {
    return <div>No source settings to edit</div>;
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

  isFieldAware() {
    return false;
  }

  isRefreshTimerAware() {
    return false;
  }

  isQueryAware() {
    return false;
  }

  isJoinable() {
    return false;
  }

  supportsESFilters() {
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
