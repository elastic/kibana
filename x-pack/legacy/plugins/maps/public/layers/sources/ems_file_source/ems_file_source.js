/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractVectorSource } from '../vector_source';
import { VECTOR_SHAPE_TYPES } from '../vector_feature_types';
import React from 'react';
import { EMS_FILE, FIELD_ORIGIN } from '../../../../common/constants';
import { getEMSClient } from '../../../meta';
import { EMSFileCreateSourceEditor } from './create_source_editor';
import { i18n } from '@kbn/i18n';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { UpdateSourceEditor } from './update_source_editor';
import { EMSFileField } from '../../fields/ems_file_field';

export class EMSFileSource extends AbstractVectorSource {
  static type = EMS_FILE;
  static title = i18n.translate('xpack.maps.source.emsFileTitle', {
    defaultMessage: 'EMS Boundaries',
  });
  static description = i18n.translate('xpack.maps.source.emsFileDescription', {
    defaultMessage: 'Administrative boundaries from Elastic Maps Service',
  });
  static icon = 'emsApp';

  static createDescriptor({ id, tooltipProperties = [] }) {
    return {
      type: EMSFileSource.type,
      id,
      tooltipProperties,
    };
  }

  static renderEditor({ onPreviewSource, inspectorAdapters }) {
    const onSourceConfigChange = sourceConfig => {
      const sourceDescriptor = EMSFileSource.createDescriptor(sourceConfig);
      const source = new EMSFileSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <EMSFileCreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  }

  constructor(descriptor, inspectorAdapters) {
    super(EMSFileSource.createDescriptor(descriptor), inspectorAdapters);
    this._tooltipFields = this._descriptor.tooltipProperties.map(propertyKey =>
      this.createField({ fieldName: propertyKey })
    );
  }

  createField({ fieldName }) {
    return new EMSFileField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  renderSourceSettingsEditor({ onChange }) {
    return (
      <UpdateSourceEditor
        onChange={onChange}
        tooltipFields={this._tooltipFields}
        layerId={this._descriptor.id}
        source={this}
      />
    );
  }

  async getEMSFileLayer() {
    const emsClient = getEMSClient();
    const emsFileLayers = await emsClient.getFileLayers();
    const emsFileLayer = emsFileLayers.find(fileLayer => fileLayer.getId() === this._descriptor.id);
    if (!emsFileLayer) {
      throw new Error(
        i18n.translate('xpack.maps.source.emsFile.unableToFindIdErrorMessage', {
          defaultMessage: `Unable to find EMS vector shapes for id: {id}`,
          values: {
            id: this._descriptor.id,
          },
        })
      );
    }
    return emsFileLayer;
  }

  async getGeoJsonWithMeta() {
    const emsFileLayer = await this.getEMSFileLayer();
    const featureCollection = await AbstractVectorSource.getGeoJson({
      format: emsFileLayer.getDefaultFormatType(),
      featureCollectionPath: 'data',
      fetchUrl: emsFileLayer.getDefaultFormatUrl(),
    });

    const emsIdField = emsFileLayer._config.fields.find(field => {
      return field.type === 'id';
    });
    featureCollection.features.forEach((feature, index) => {
      feature.id = emsIdField ? feature.properties[emsIdField.id] : index;
    });

    return {
      data: featureCollection,
      meta: {},
    };
  }

  async getImmutableProperties() {
    let emsLink;
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      emsLink = emsFileLayer.getEMSHotLink();
    } catch (error) {
      // ignore error if EMS layer id could not be found
    }

    return [
      {
        label: getDataSourceLabel(),
        value: EMSFileSource.title,
      },
      {
        label: i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: `Layer`,
        }),
        value: this._descriptor.id,
        link: emsLink,
      },
    ];
  }

  async getDisplayName() {
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      return emsFileLayer.getDisplayName();
    } catch (error) {
      return this._descriptor.id;
    }
  }

  async getAttributions() {
    const emsFileLayer = await this.getEMSFileLayer();
    return emsFileLayer.getAttributions();
  }

  async getLeftJoinFields() {
    const emsFileLayer = await this.getEMSFileLayer();
    const fields = emsFileLayer.getFieldsInLanguage();
    return fields.map(f => this.createField({ fieldName: f.name }));
  }

  canFormatFeatureProperties() {
    return this._tooltipFields.length > 0;
  }

  async filterAndFormatPropertiesToHtml(properties) {
    const tooltipProperties = this._tooltipFields.map(field => {
      const value = properties[field.getName()];
      return field.createTooltipProperty(value);
    });

    return Promise.all(tooltipProperties);
  }

  async getSupportedShapeTypes() {
    return [VECTOR_SHAPE_TYPES.POLYGON];
  }
}
