/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { RasterTileSource } from 'maplibre-gl';
import { AbstractSource } from '../source';
import { getDataSourceLabel, getUrlLabel } from '../../../../common/i18n_getters';
// @ts-ignore
import { WmsClient } from './wms_client';
import { SOURCE_TYPES } from '../../../../common/constants';
import { IRasterSource, RasterTileSourceData } from '../raster_source';
import { WMSSourceDescriptor } from '../../../../common/descriptor_types';
export const sourceTitle = i18n.translate('xpack.maps.source.wmsTitle', {
  defaultMessage: 'Web Map Service',
});

export class WMSSource extends AbstractSource implements IRasterSource {
  static type = SOURCE_TYPES.WMS;
  readonly _descriptor: WMSSourceDescriptor;
  static createDescriptor({ serviceUrl, layers, styles }: Partial<WMSSourceDescriptor>) {
    return {
      type: WMSSource.type,
      serviceUrl,
      layers,
      styles,
    } as WMSSourceDescriptor;
  }
  constructor(sourceDescriptor: WMSSourceDescriptor) {
    super(sourceDescriptor);
    this._descriptor = sourceDescriptor;
  }
  async hasLegendDetails(): Promise<boolean> {
    return false;
  }

  renderLegendDetails(): ReactElement<any> | null {
    return null;
  }

  isSourceStale(mbSource: RasterTileSource, sourceData: RasterTileSourceData) {
    if (!sourceData.url) {
      return false;
    }
    return mbSource.tiles?.[0] !== sourceData.url;
  }
  async canSkipSourceUpdate() {
    return false;
  }
  async getImmutableProperties() {
    return [
      { label: getDataSourceLabel(), value: sourceTitle },
      { label: getUrlLabel(), value: this._descriptor.serviceUrl },
      {
        label: i18n.translate('xpack.maps.source.wms.layersLabel', {
          defaultMessage: 'Layers',
        }),
        value: this._descriptor.layers,
      },
      {
        label: i18n.translate('xpack.maps.source.wms.stylesLabel', {
          defaultMessage: 'Styles',
        }),
        value: this._descriptor.styles,
      },
    ];
  }

  async getDisplayName() {
    return this._descriptor.serviceUrl;
  }

  async getUrlTemplate() {
    const client = new WmsClient({ serviceUrl: this._descriptor.serviceUrl });
    return client.getUrlTemplate(this._descriptor.layers, this._descriptor.styles || '');
  }
}
