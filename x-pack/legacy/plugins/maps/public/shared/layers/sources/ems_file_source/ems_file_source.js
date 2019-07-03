/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import React from 'react';
import { EMS_FILE } from '../../../../../common/constants';
import { getEmsVectorFilesMeta } from '../../../../meta';
import { EMSFileCreateSourceEditor } from './create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../../common/i18n_getters';
import { UpdateSourceEditor } from './update_source_editor';
import { TooltipProperty } from '../../tooltips/tooltip_property';

export class EMSFileSource extends AbstractVectorSource {

  static type = EMS_FILE;
  static title =  i18n.translate('xpack.maps.source.emsFileTitle', {
    defaultMessage: 'Vector shapes'
  });
  static description = i18n.translate('xpack.maps.source.emsFileDescription', {
    defaultMessage: 'Vector shapes of administrative boundaries from Elastic Maps Service'
  });
  static icon = 'emsApp';

  static createDescriptor({ id, tooltipProperties = [] }) {
    return {
      type: EMSFileSource.type,
      id,
      tooltipProperties
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onChange = (selectedId) => {
      const emsFileSourceDescriptor = EMSFileSource.createDescriptor({ id: selectedId });
      const emsFileSource = new EMSFileSource(emsFileSourceDescriptor, inspectorAdapters);
      onPreviewSource(emsFileSource);
    };
    return <EMSFileCreateSourceEditor onChange={onChange}/>;
  }

  constructor(descriptor, inspectorAdapters) {
    super(EMSFileSource.createDescriptor(descriptor), inspectorAdapters);
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        onChange={onChange}
        tooltipProperties={this._descriptor.tooltipProperties}
        layerId={this._descriptor.id}
      />
    );
  }

  async _getEmsVectorFileMeta() {
    const emsFiles = await getEmsVectorFilesMeta();
    const meta = emsFiles.find((source => source.id === this._descriptor.id));
    if (!meta) {
      throw new Error(i18n.translate('xpack.maps.source.emsFile.unableToFindIdErrorMessage', {
        defaultMessage: `Unable to find EMS vector shapes for id: {id}`,
        values: {
          id: this._descriptor.id
        }
      }));
    }
    return meta;
  }

  async getGeoJsonWithMeta() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: emsVectorFileMeta.format,
      featureCollectionPath: 'data',
      fetchUrl: emsVectorFileMeta.url
    });
    return {
      data: featureCollection,
      meta: {}
    };
  }

  async getImmutableProperties() {
    let emsLink;
    try {
      const emsVectorFileMeta = await this._getEmsVectorFileMeta();
      emsLink = emsVectorFileMeta.emsLink;
    } catch(error) {
      // ignore error if EMS layer id could not be found
    }

    return [
      {
        label: getDataSourceLabel(),
        value: EMSFileSource.title
      },
      {
        label: i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: `Layer`,
        }),
        value: this._descriptor.id,
        link: emsLink
      }
    ];
  }

  async getDisplayName() {
    try {
      const emsVectorFileMeta = await this._getEmsVectorFileMeta();
      return emsVectorFileMeta.name;
    } catch (error) {
      return this._descriptor.id;
    }
  }

  async getAttributions() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    return emsVectorFileMeta.attributions;
  }


  async getLeftJoinFields() {
    const emsVectorFileMeta = await this._getEmsVectorFileMeta();
    return emsVectorFileMeta.fields.map(f => {
      return { name: f.name, label: f.description };
    });
  }

  canFormatFeatureProperties() {
    return this._descriptor.tooltipProperties.length;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    const meta = await this._getEmsVectorFileMeta();
    const tooltipProperties = [];
    for (const key in properties) {
      if (properties.hasOwnProperty(key) && this._descriptor.tooltipProperties.indexOf(key) > -1) {
        let newFieldName = key;
        for (let i = 0; i < meta.fields.length; i++) {
          if (meta.fields[i].name === key) {
            newFieldName = meta.fields[i].description;
            break;
          }
        }
        tooltipProperties.push(new TooltipProperty(key, newFieldName, properties[key]));
      }
    }
    return tooltipProperties;
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPES.POLYGON];
  }

}
