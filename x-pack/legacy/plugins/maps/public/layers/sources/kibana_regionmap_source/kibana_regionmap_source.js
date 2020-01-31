/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { getKibanaRegionList } from '../../../meta';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { FEATURE_ID_PROPERTY_NAME } from '../../../../common/constants';

export class KibanaRegionmapSource extends AbstractVectorSource {
  static type = 'REGIONMAP_FILE';
  static title = i18n.translate('xpack.maps.source.kbnRegionMapTitle', {
    defaultMessage: 'Configured GeoJSON',
  });
  static description = i18n.translate('xpack.maps.source.kbnRegionMapDescription', {
    defaultMessage: 'Vector data from hosted GeoJSON configured in kibana.yml',
  });
  static icon = 'logoKibana';

  static createDescriptor({ name }) {
    return {
      type: KibanaRegionmapSource.type,
      name: name,
    };
  }

  static renderEditor = ({ onPreviewSource, inspectorAdapters }) => {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = KibanaRegionmapSource.createDescriptor(sourceConfig);
      const source = new KibanaRegionmapSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  };

  async getImmutableProperties() {
    return [
      {
        label: getDataSourceLabel(),
        value: KibanaRegionmapSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.kbnRegionMap.vectorLayerLabel', {
          defaultMessage: 'Vector layer',
        }),
        value: this._descriptor.name,
      },
    ];
  }

  async _getVectorFileMeta() {
    const regionList = getKibanaRegionList();
    const meta = regionList.find(source => source.name === this._descriptor.name);
    if (!meta) {
      throw new Error(
        i18n.translate('xpack.maps.source.kbnRegionMap.noConfigErrorMessage', {
          defaultMessage: `Unable to find map.regionmap configuration for {name}`,
          values: {
            name: this._descriptor.name,
          },
        })
      );
    }
    return meta;
  }

  async getGeoJsonWithMeta() {
    const vectorFileMeta = await this._getVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: vectorFileMeta.format.type,
      featureCollectionPath: vectorFileMeta.meta.feature_collection_path,
      fetchUrl: vectorFileMeta.url,
    });
    featureCollection.features.forEach((feature, index) => {
      feature.properties[FEATURE_ID_PROPERTY_NAME] = index;
    });
    return {
      data: featureCollection,
    };
  }

  async getLeftJoinFields() {
    const vectorFileMeta = await this._getVectorFileMeta();
    return vectorFileMeta.fields.map(f => {
      return { name: f.name, label: f.description };
    });
  }

  async getDisplayName() {
    return this._descriptor.name;
  }

  async isTimeAware() {
    return false;
  }

  canFormatFeatureProperties() {
    return true;
  }
}
