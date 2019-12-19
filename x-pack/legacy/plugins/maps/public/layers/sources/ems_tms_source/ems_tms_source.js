/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import chrome from 'ui/chrome';
import React from 'react';
import { AbstractTMSSource } from '../tms_source';
import { VectorTileLayer } from '../../vector_tile_layer';

import { getEMSClient } from '../../../meta';
import { TileServiceSelect } from './tile_service_select';
import { UpdateSourceEditor } from './update_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { EMS_TMS } from '../../../../common/constants';

export class EMSTMSSource extends AbstractTMSSource {
  static type = EMS_TMS;
  static title = i18n.translate('xpack.maps.source.emsTileTitle', {
    defaultMessage: 'EMS Basemaps',
  });
  static description = i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Tile map service from Elastic Maps Service',
  });
  static icon = 'emsApp';

  static createDescriptor(sourceConfig) {
    return {
      type: EMSTMSSource.type,
      id: sourceConfig.id,
      isAutoSelect: sourceConfig.isAutoSelect,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      const descriptor = EMSTMSSource.createDescriptor(sourceConfig);
      const source = new EMSTMSSource(descriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <TileServiceSelect onTileSelect={onSourceConfigChange} />;
  }

  constructor(descriptor, inspectorAdapters) {
    super(
      {
        id: descriptor.id,
        type: EMSTMSSource.type,
        isAutoSelect: _.get(descriptor, 'isAutoSelect', false),
      },
      inspectorAdapters
    );
  }

  renderSourceSettingsEditor({ onChange }) {
    console.log(this._descriptor);
    return <UpdateSourceEditor onChange={onChange} config={this._descriptor} />;
  }

  async getImmutableProperties() {
    const displayName = await this.getDisplayName();
    const autoSelectMsg = i18n.translate('xpack.maps.source.emsTile.isAutoSelectLabel', {
      defaultMessage: 'autoselect based on Kibana theme',
    });

    return [
      {
        label: getDataSourceLabel(),
        value: EMSTMSSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.isAutoSelect ? `${displayName} - ${autoSelectMsg}` : displayName,
      },
    ];
  }

  async _getEMSTMSService() {
    const emsClient = getEMSClient();
    const emsTMSServices = await emsClient.getTMSServices();
    const emsTileLayerId = this._getEmsTileLayerId();
    const tmsService = emsTMSServices.find(tmsService => tmsService.getId() === emsTileLayerId);
    if (!tmsService) {
      throw new Error(
        i18n.translate('xpack.maps.source.emsTile.errorMessage', {
          defaultMessage: `Unable to find EMS tile configuration for id: {id}`,
          values: { id: emsTileLayerId },
        })
      );
    }
    return tmsService;
  }

  _createDefaultLayerDescriptor(options) {
    return VectorTileLayer.createDescriptor({
      sourceDescriptor: this._descriptor,
      ...options,
    });
  }

  createDefaultLayer(options) {
    return new VectorTileLayer({
      layerDescriptor: this._createDefaultLayerDescriptor(options),
      source: this,
    });
  }

  async getDisplayName() {
    try {
      const emsTMSService = await this._getEMSTMSService();
      return emsTMSService.getDisplayName();
    } catch (error) {
      return this._getEmsTileLayerId();
    }
  }

  async getAttributions() {
    const emsTMSService = await this._getEMSTMSService();
    const markdown = emsTMSService.getMarkdownAttribution();
    if (!markdown) {
      return [];
    }
    return this.convertMarkdownLinkToObjectArr(markdown);
  }

  async getUrlTemplate() {
    const emsTMSService = await this._getEMSTMSService();
    return await emsTMSService.getUrlTemplate();
  }

  getSpriteNamespacePrefix() {
    return 'ems/' + this._getEmsTileLayerId();
  }

  async getVectorStyleSheetAndSpriteMeta(isRetina) {
    const emsTMSService = await this._getEMSTMSService();
    const styleSheet = await emsTMSService.getVectorStyleSheet();
    const spriteMeta = await emsTMSService.getSpriteSheetMeta(isRetina);
    return {
      vectorStyleSheet: styleSheet,
      spriteMeta: spriteMeta,
    };
  }

  _getEmsTileLayerId() {
    if (!this._descriptor.isAutoSelect) {
      return this._descriptor.id;
    }

    const isDarkMode = chrome.getUiSettingsClient().get('theme:darkMode', false);
    const emsTileLayerId = chrome.getInjected('emsTileLayerId');
    return isDarkMode ? emsTileLayerId.dark : emsTileLayerId.bright;
  }
}
