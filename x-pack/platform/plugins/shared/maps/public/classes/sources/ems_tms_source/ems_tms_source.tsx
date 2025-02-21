/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DEFAULT_EMS_ROADMAP_ID } from '@kbn/maps-ems-plugin/common';
import { AbstractSource, SourceEditorArgs } from '../source';
import { ITMSSource } from '../tms_source';
import { getEmsTmsServices } from '../../../util';
import { UpdateSourceEditor } from './update_source_editor';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { SOURCE_TYPES } from '../../../../common/constants';
import { EMSTMSSourceDescriptor } from '../../../../common/descriptor_types';
import { getEmsTileLayerId, getIsDarkMode, getEMSSettings } from '../../../kibana_services';
import { getEmsUnavailableMessage } from '../../../components/ems_unavailable_message';
import { LICENSED_FEATURES } from '../../../licensed_features';

function getErrorInfo(emsTileLayerId: string) {
  return i18n.translate('xpack.maps.source.emsTile.unableToFindTileIdErrorMessage', {
    defaultMessage: `Unable to find EMS tile configuration for id: {id}. {info}`,
    values: { id: emsTileLayerId, info: getEmsUnavailableMessage() },
  });
}

export function getSourceTitle() {
  const emsSettings = getEMSSettings();
  if (emsSettings.isEMSUrlSet()) {
    return i18n.translate('xpack.maps.source.emsOnPremTileTitle', {
      defaultMessage: 'Elastic Maps Server Basemaps',
    });
  } else {
    return i18n.translate('xpack.maps.source.emsTileTitle', {
      defaultMessage: 'EMS Basemaps',
    });
  }
}

export class EMSTMSSource extends AbstractSource implements ITMSSource {
  static createDescriptor(descriptor: Partial<EMSTMSSourceDescriptor>): EMSTMSSourceDescriptor {
    return {
      type: SOURCE_TYPES.EMS_TMS,
      id: descriptor.id,
      isAutoSelect:
        typeof descriptor.isAutoSelect !== 'undefined' ? descriptor.isAutoSelect : false,
      lightModeDefault:
        descriptor.lightModeDefault === undefined ||
        descriptor.lightModeDefault !== DEFAULT_EMS_ROADMAP_ID
          ? getEmsTileLayerId().desaturated
          : DEFAULT_EMS_ROADMAP_ID,
    };
  }

  readonly _descriptor: EMSTMSSourceDescriptor;

  constructor(descriptor: Partial<EMSTMSSourceDescriptor>) {
    const emsTmsDescriptor = EMSTMSSource.createDescriptor(descriptor);
    super(emsTmsDescriptor);
    this._descriptor = emsTmsDescriptor;
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs) {
    return <UpdateSourceEditor onChange={onChange} config={this._descriptor} />;
  }

  async getImmutableProperties() {
    const tileServiceName = await this._getTileServiceName();
    const autoSelectMsg = i18n.translate('xpack.maps.source.emsTile.isAutoSelectLabel', {
      defaultMessage: 'autoselect based on Kibana theme',
    });

    const props = [
      {
        label: getDataSourceLabel(),
        value: getSourceTitle(),
      },
      {
        label: i18n.translate('xpack.maps.source.emsTile.serviceId', {
          defaultMessage: `Tile service`,
        }),
        value: this._descriptor.isAutoSelect
          ? `${tileServiceName} - ${autoSelectMsg}`
          : tileServiceName,
      },
    ];

    const emsSettings = getEMSSettings();
    if (emsSettings.isEMSUrlSet()) {
      props.push({
        label: i18n.translate('xpack.maps.source.emsTile.emsOnPremLabel', {
          defaultMessage: `Elastic Maps Server`,
        }),
        value: emsSettings.getEMSRoot(),
      });
    }

    return props;
  }

  async _getEMSTMSService() {
    let emsTMSServices;
    const emsTileLayerId = this.getTileLayerId();
    try {
      emsTMSServices = await getEmsTmsServices();
    } catch (e) {
      throw new Error(`${getErrorInfo(emsTileLayerId)} - ${e.message}`);
    }
    const tmsService = emsTMSServices.find((service) => service.getId() === emsTileLayerId);
    if (!tmsService) {
      throw new Error(getErrorInfo(emsTileLayerId));
    }

    return tmsService;
  }

  async getDisplayName() {
    return i18n.translate('xpack.maps.source.emsTile.basemapLabel', {
      defaultMessage: 'Basemap',
    });
  }

  async _getTileServiceName() {
    try {
      const emsTMSService = await this._getEMSTMSService();
      return emsTMSService.getDisplayName();
    } catch (error) {
      return this.getTileLayerId();
    }
  }

  getAttributionProvider() {
    return async () => {
      const emsTMSService = await this._getEMSTMSService();
      return emsTMSService.getAttributions();
    };
  }

  async getUrlTemplate(): Promise<string> {
    const emsTMSService = await this._getEMSTMSService();
    return await emsTMSService.getUrlTemplate();
  }

  getSpriteNamespacePrefix() {
    return 'ems/' + this.getTileLayerId();
  }

  async getVectorStyleSheetAndSpriteMeta(isRetina: boolean) {
    const emsTMSService = await this._getEMSTMSService();
    const styleSheet = await emsTMSService.getVectorStyleSheet();
    const spriteMeta = await emsTMSService.getSpriteSheetMeta(isRetina);
    return {
      vectorStyleSheet: styleSheet,
      spriteMeta,
    };
  }

  getTileLayerId() {
    if (!this._descriptor.isAutoSelect && this._descriptor.id) {
      return this._descriptor.id;
    }

    return getIsDarkMode() ? getEmsTileLayerId().dark : this._descriptor.lightModeDefault;
  }

  async getLicensedFeatures() {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() ? [LICENSED_FEATURES.ON_PREM_EMS] : [];
  }
}
