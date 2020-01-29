/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractSource } from '../source';
import { MVTVectorSourceEditor } from './mvt_vector_source_editor';
import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import {TileLayer} from "../../tile_layer";
import {TiledVectorLayer} from "../../tiled_vector_layer";

export class MVTVectorSource extends AbstractSource {
  static type = 'TiledVectorSource';
  static title = i18n.translate('xpack.maps.source.tiledVectorTitle', {
    defaultMessage: 'Tiled vector',
  });
  static description = i18n.translate('xpack.maps.source.tiledVectorDescription', {
    defaultMessage: 'Tiled vector with url template',
  });

  static icon = 'logoElasticsearch';

  static createDescriptor({ urlTemplate }) {
    return {
      type: MVTVectorSource.type,
      id: uuid(),
      urlTemplate,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = MVTVectorSource.createDescriptor(sourceConfig);
      const source = new MVTVectorSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <MVTVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  renderSourceSettingsEditor({ onChange }) {
    return (<div>No source settings to edit</div>);
  }

  _createDefaultLayerDescriptor(options) {
    return TiledVectorLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
  }

  createDefaultLayer(options) {
    return new TiledVectorLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this,
    });
  }

  async getUrlTemplate() {
   return this._descriptor.urlTemplate;
  }
}
