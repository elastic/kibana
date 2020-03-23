/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';
import { CreateSourceEditor } from './create_source_editor';
import { getKibanaTileMap } from '../../../meta';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import _ from 'lodash';

export class KibanaTilemapSource extends AbstractTMSSource {
  static type = 'KIBANA_TILEMAP';
  static title = i18n.translate('xpack.maps.source.kbnTMSTitle', {
    defaultMessage: 'Configured Tile Map Service',
  });
  static description = i18n.translate('xpack.maps.source.kbnTMSDescription', {
    defaultMessage: 'Tile map service configured in kibana.yml',
  });

  static icon = 'logoKibana';

  static createDescriptor() {
    return {
      type: KibanaTilemapSource.type,
    };
  }

  static renderEditor = ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = () => {
      const sourceDescriptor = KibanaTilemapSource.createDescriptor();
      const source = new KibanaTilemapSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  };

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: KibanaTilemapSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.kbnTMS.urlLabel', {
          defaultMessage: 'Tilemap url',
        }),
        value: await this.getUrlTemplate(),
      },
    ];
  }

  _createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
  }

  createDefaultLayer(options) {
    return new TileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this,
    });
  }

  async getUrlTemplate() {
    const tilemap = getKibanaTileMap();
    if (!tilemap.url) {
      throw new Error(
        i18n.translate('xpack.maps.source.kbnTMS.noConfigErrorMessage', {
          defaultMessage: `Unable to find map.tilemap.url configuration in the kibana.yml`,
        })
      );
    }
    return tilemap.url;
  }

  async getAttributions() {
    const tilemap = getKibanaTileMap();
    const markdown = _.get(tilemap, 'options.attribution', '');
    const objArr = this.convertMarkdownLinkToObjectArr(markdown);
    return objArr;
  }

  async getDisplayName() {
    try {
      return await this.getUrlTemplate();
    } catch (e) {
      return '';
    }
  }
}
