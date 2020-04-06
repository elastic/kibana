/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import uuid from 'uuid/v4';
import React from 'react';
import { MVTVectorSourceEditor } from './mvt_vector_source_editor';
import { AbstractSource } from '../source';
import { TiledVectorLayer } from '../../tiled_vector_layer';
import { GeoJsonWithMeta, ITiledSingleLayerVectorSource } from '../vector_source';
import { MVT_SINGLE_LAYER } from '../../../../../../../plugins/maps/common/constants';
import { IField } from '../../fields/field';
import { registerSource } from '../source_registry';

const sourceTitle = i18n.translate('xpack.maps.source.ems_xyzVectorTitle', {
  defaultMessage: 'XYZ Vector Tile Layer',
});

export class MVTSingleLayerVectorSource extends AbstractSource
  implements ITiledSingleLayerVectorSource {
  static type = MVT_SINGLE_LAYER;
  static title = i18n.translate('xpack.maps.source.tiledSingleLayerVectorTitle', {
    defaultMessage: 'Tiled vector',
  });
  static description = i18n.translate('xpack.maps.source.tiledSingleLayerVectorDescription', {
    defaultMessage: 'Tiled vector with url template',
  });

  static icon = 'logoElasticsearch';

  static createDescriptor({ urlTemplate }) {
    return {
      type: MVTSingleLayerVectorSource.type,
      id: uuid(),
      urlTemplate,
    };
  }

  renderSourceSettingsEditor({ onChange }) {
    return <div>No source settings to edit</div>;
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

  getGeoJsonWithMeta(
    layerName: 'string',
    searchFilters: unknown[],
    registerCancelCallback: (callback: () => void) => void
  ): Promise<GeoJsonWithMeta> {
    throw new Error('Does not implement getGeoJsonWithMeta');
  }

  async getFields(): Promise<IField[]> {
    return [];
  }

  getFieldByName(fieldName: string) {
    return null;
  }

  async getUrlTemplateWithMeta() {
    return this._descriptor.urlTemplate;
  }

  getSupportedShapeTypes() {
    return [];
  }

  canFormatFeatureProperties() {
    return false;
  }
}

registerSource({
  ConstructorFunction: MVTSingleLayerVectorSource,
  type: MVT_SINGLE_LAYER,
});

export const mvtVectorSourceWizardConfig = {
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Vector source wizard',
  }),
  icon: 'grid',
  renderWizard: ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
      const source = new MVTSingleLayerVectorSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <MVTVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
