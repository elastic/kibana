/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { TileLayer } from '../../tile_layer';

import { getEmsTMSServices } from '../../../../meta';
import { EMSTMSCreateSourceEditor } from './create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';

export class EMSTMSSource extends AbstractTMSSource {

  static type = 'EMS_TMS';
  static title = i18n.translate('xpack.maps.source.emsTileTitle', {
    defaultMessage: 'Tiles'
  });
  static description = i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Map tiles from Elastic Maps Service'
  });
  static icon = 'emsApp';

  static createDescriptor(sourceConfig) {
    return {
      type: EMSTMSSource.type,
      id: sourceConfig.id,
      isAutoSelect: sourceConfig.isAutoSelect
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = (sourceConfig) => {
      const descriptor = EMSTMSSource.createDescriptor(sourceConfig);
      const source = new EMSTMSSource(descriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <EMSTMSCreateSourceEditor onSourceConfigChange={onSourceConfigChange}/>;
  }

  constructor(descriptor, inspectorAdapters) {
    super({
      id: descriptor.id,
      type: EMSTMSSource.type,
      isAutoSelect: _.get(descriptor, 'isAutoSelect', false),
    }, inspectorAdapters);
  }

  async getImmutableProperties() {
    const displayName = await this.getDisplayName();
    const autoSelectMsg = i18n.translate('xpack.maps.source.emsTile.isAutoSelectLabel', {
      defaultMessage: 'autoselect based on Kibana theme',
    });

    return [
      {
        label: getDataSourceLabel(),
        value: EMSTMSSource.title
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.isAutoSelect
          ? `${displayName} - ${autoSelectMsg}`
          : displayName
      }
    ];
  }

  async _getEmsTmsMeta() {
    const emsTileServices = await getEmsTMSServices();
    const emsTileLayerId = this._getEmsTileLayerId();
    const meta = emsTileServices.find(service => {
      return service.id === emsTileLayerId;
    });
    if (!meta) {
      throw new Error(i18n.translate('xpack.maps.source.emsTile.errorMessage', {
        defaultMessage: `Unable to find EMS tile configuration for id: {id}`,
        values: { id: emsTileLayerId }
      }));
    }
    return meta;
  }

  _createDefaultLayerDescriptor(options) {
    return TileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options
    });
  }

  createDefaultLayer(options) {
    return new TileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this
    });
  }

  async getDisplayName() {
    try {
      const emsTmsMeta = await this._getEmsTmsMeta();
      return emsTmsMeta.name;
    } catch (error) {
      return this._getEmsTileLayerId();
    }
  }

  async getAttributions() {
    const emsTmsMeta = await this._getEmsTmsMeta();
    if (!emsTmsMeta.attributionMarkdown) {
      return [];
    }

    return emsTmsMeta.attributionMarkdown.split('|').map((attribution) => {
      attribution = attribution.trim();
      //this assumes attribution is plain markdown link
      const extractLink = /\[(.*)\]\((.*)\)/;
      const result = extractLink.exec(attribution);
      return {
        label: result ? result[1] : null,
        url: result ? result[2] : null
      };
    });
  }

  async getUrlTemplate() {
    const emsTmsMeta = await this._getEmsTmsMeta();
    return emsTmsMeta.url;
  }

  _getEmsTileLayerId() {
    if (!this._descriptor.isAutoSelect) {
      return this._descriptor.id;
    }

    const isDarkMode = chrome.getUiSettingsClient().get('theme:darkMode', false);
    const emsTileLayerId = chrome.getInjected('emsTileLayerId');
    return isDarkMode
      ? emsTileLayerId.dark
      : emsTileLayerId.bright;
  }
}
