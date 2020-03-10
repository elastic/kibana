/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { IField } from './field';
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { IVectorSource } from '../sources/vector_source';
import { IEmsFileSource } from '../sources/ems_file_source/ems_file_source';

export class EMSFileField implements IField {
  static type = 'EMS_FILE';

  private _fieldName: string;
  private _source: IEmsFileSource;
  private _origin: FIELD_ORIGIN;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IEmsFileSource;
    origin: FIELD_ORIGIN;
  }) {
    this._fieldName = fieldName;
    this._source = source;
    this._origin = origin || FIELD_ORIGIN.SOURCE;
  }

  getName(): string {
    return this._fieldName;
  }

  getRootName(): string {
    return this.getName();
  }

  canValueBeFormatted(): boolean {
    return false;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  isValid(): boolean {
    return !!this._fieldName;
  }

  async getDataType(): Promise<string> {
    return 'string';
  }

  async getLabel(): Promise<string> {
    const emsFileLayer = await this._source.getEMSFileLayer();
    // TODO remove any and @ts-ignore when emsFileLayer type defined
    // @ts-ignore
    const emsFields: any[] = emsFileLayer.getFieldsInLanguage();
    // Map EMS field name to language specific label
    const emsField = emsFields.find(field => field.name === this.getName());
    return emsField ? emsField.description : this.getName();
  }

  async createTooltipProperty(value: string | undefined): Promise<ITooltipProperty> {
    const label = await this.getLabel();
    return new TooltipProperty(this.getName(), label, value);
  }

  getOrigin(): FIELD_ORIGIN {
    return this._origin;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return null;
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    return null;
  }
}
