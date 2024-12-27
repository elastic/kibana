/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { i18n } from '@kbn/i18n';
import { Feature, GeoJsonProperties } from 'geojson';
import { FileLayer } from '@elastic/ems-client';
import { ImmutableSourceProperty, SourceEditorArgs } from '../source';
import { AbstractVectorSource, GeoJsonWithMeta, IVectorSource } from '../vector_source';
import { SOURCE_TYPES, FIELD_ORIGIN, VECTOR_SHAPE_TYPE } from '../../../../common/constants';
import { getEmsFileLayers } from '../../../util';
import { getDataSourceLabel } from '../../../../common/i18n_getters';
import { UpdateSourceEditor } from './update_source_editor';
import { EMSFileField } from '../../fields/ems_file_field';
import { IField } from '../../fields/field';
import { EMSFileSourceDescriptor } from '../../../../common/descriptor_types';
import { ITooltipProperty } from '../../tooltips/tooltip_property';
import { getEMSSettings } from '../../../kibana_services';
import { getEmsUnavailableMessage } from '../../../components/ems_unavailable_message';
import { LICENSED_FEATURES } from '../../../licensed_features';

function getErrorInfo(fileId: string) {
  return i18n.translate('xpack.maps.source.emsFile.unableToFindFileIdErrorMessage', {
    defaultMessage: `Unable to find EMS vector shapes for id: {id}. {info}`,
    values: {
      id: fileId,
      info: getEmsUnavailableMessage(),
    },
  });
}

export interface IEmsFileSource extends IVectorSource {
  getEmsFieldLabel(emsFieldName: string): Promise<string>;
}

export function getSourceTitle() {
  const emsSettings = getEMSSettings();
  if (emsSettings.isEMSUrlSet()) {
    return i18n.translate('xpack.maps.source.emsOnPremFileTitle', {
      defaultMessage: 'Elastic Maps Server Boundaries',
    });
  } else {
    return i18n.translate('xpack.maps.source.emsFileTitle', {
      defaultMessage: 'EMS Boundaries',
    });
  }
}

export class EMSFileSource extends AbstractVectorSource implements IEmsFileSource {
  static createDescriptor({ id, tooltipProperties = [] }: Partial<EMSFileSourceDescriptor>) {
    return {
      type: SOURCE_TYPES.EMS_FILE,
      id: id!,
      tooltipProperties,
    };
  }

  private readonly _tooltipFields: IField[];
  readonly _descriptor: EMSFileSourceDescriptor;

  constructor(descriptor: Partial<EMSFileSourceDescriptor>) {
    super(EMSFileSource.createDescriptor(descriptor));
    this._descriptor = EMSFileSource.createDescriptor(descriptor);
    this._tooltipFields = this._descriptor.tooltipProperties.map((propertyKey) =>
      this.getFieldByName(propertyKey)
    );
  }

  renderSourceSettingsEditor({ onChange }: SourceEditorArgs): ReactElement<any> | null {
    return (
      <UpdateSourceEditor
        onChange={onChange}
        tooltipFields={this._tooltipFields}
        layerId={this._descriptor.id}
        source={this}
      />
    );
  }

  async getEMSFileLayer(): Promise<FileLayer> {
    let emsFileLayers: FileLayer[];
    try {
      emsFileLayers = await getEmsFileLayers();
    } catch (e) {
      throw new Error(`${getErrorInfo(this._descriptor.id)} - ${e.message}`);
    }

    const emsFileLayer = emsFileLayers.find((fileLayer) => fileLayer.hasId(this._descriptor.id));
    if (emsFileLayer) {
      return emsFileLayer;
    }

    throw new Error(getErrorInfo(this._descriptor.id));
  }

  // Map EMS field name to language specific label
  async getEmsFieldLabel(emsFieldName: string): Promise<string> {
    const emsFileLayer = await this.getEMSFileLayer();
    const emsFields = emsFileLayer.getFieldsInLanguage();

    const emsField = emsFields.find((field) => field.name === emsFieldName);
    return emsField ? emsField.description : emsFieldName;
  }

  async getGeoJsonWithMeta(): Promise<GeoJsonWithMeta> {
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      const featureCollection = await emsFileLayer.getGeoJson();

      if (!featureCollection) throw new Error('No features found');

      const emsIdField = emsFileLayer.getFields().find((field) => {
        return field.type === 'id';
      });
      featureCollection.features.forEach((feature: Feature, index: number) => {
        feature.id = emsIdField ? feature!.properties![emsIdField.id] : index;
      });

      return {
        data: featureCollection,
        meta: {},
      };
    } catch (error) {
      throw new Error(getErrorInfo(this._descriptor.id));
    }
  }

  async getImmutableProperties(): Promise<ImmutableSourceProperty[]> {
    let emsLink;
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      emsLink = emsFileLayer.getEMSHotLink();
    } catch (error) {
      // ignore error if EMS layer id could not be found
    }

    const props = [
      {
        label: getDataSourceLabel(),
        value: getSourceTitle(),
      },
      {
        label: i18n.translate('xpack.maps.source.emsFile.layerLabel', {
          defaultMessage: `Layer`,
        }),
        value: this._descriptor.id,
        link: emsLink,
      },
    ];

    const emsSettings = getEMSSettings();
    if (emsSettings.isEMSUrlSet()) {
      props.push({
        label: i18n.translate('xpack.maps.source.emsFile.emsOnPremLabel', {
          defaultMessage: `Elastic Maps Server`,
        }),
        value: emsSettings.getEMSRoot(),
      });
    }
    return props;
  }

  async getDisplayName(): Promise<string> {
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      return emsFileLayer.getDisplayName();
    } catch (error) {
      return this._descriptor.id;
    }
  }

  getAttributionProvider() {
    return async () => {
      const emsFileLayer = await this.getEMSFileLayer();
      return emsFileLayer.getAttributions();
    };
  }

  async getFields(): Promise<IField[]> {
    const emsFileLayer = await this.getEMSFileLayer();
    const fields = emsFileLayer.getFieldsInLanguage();
    return fields.map((f) => this.getFieldByName(f.name));
  }

  getFieldByName(fieldName: string): IField {
    return new EMSFileField({
      fieldName,
      source: this,
      origin: FIELD_ORIGIN.SOURCE,
    });
  }

  async getLeftJoinFields() {
    return this.getFields();
  }

  hasTooltipProperties() {
    return this._tooltipFields.length > 0;
  }

  async getTooltipProperties(properties: GeoJsonProperties): Promise<ITooltipProperty[]> {
    const promises = this._tooltipFields.map((field) => {
      // @ts-ignore
      const value = properties[field.getName()];
      return field.createTooltipProperty(value);
    });

    return Promise.all(promises);
  }

  async getSupportedShapeTypes(): Promise<VECTOR_SHAPE_TYPE[]> {
    return [VECTOR_SHAPE_TYPE.POLYGON];
  }

  async getLicensedFeatures(): Promise<LICENSED_FEATURES[]> {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() ? [LICENSED_FEATURES.ON_PREM_EMS] : [];
  }

  private async _getFieldValues(fieldName: string): Promise<string[]> {
    try {
      const emsFileLayer = await this.getEMSFileLayer();
      const targetEmsField = emsFileLayer.getFields().find(({ id }) => id === fieldName);
      if (targetEmsField?.values?.length) {
        return targetEmsField.values;
      }

      // Fallback to pulling values from feature properties when values are not available in file definition
      const valuesSet = new Set<string>(); // use set to avoid duplicate values
      const featureCollection = await emsFileLayer.getGeoJson();
      featureCollection?.features.forEach((feature) => {
        if (
          feature.properties &&
          fieldName in feature.properties &&
          feature.properties[fieldName] != null
        ) {
          valuesSet.add(feature.properties[fieldName].toString());
        }
      });
      return Array.from(valuesSet);
    } catch (error) {
      // ignore errors
      return [];
    }
  }

  getValueSuggestions = async (field: IField, query: string): Promise<string[]> => {
    const values = await this._getFieldValues(field.getName());
    return query.length
      ? values.filter((value) => value.toLowerCase().includes(query.toLowerCase()))
      : values;
  };
}
