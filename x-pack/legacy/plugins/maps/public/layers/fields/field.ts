/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';

export interface IField {
  getName(): string;
  getRootName(): string;
  canValueBeFormatted(): boolean;
  getLabel(): Promise<string>;
  getDataType(): Promise<string>;
}

export class AbstractField implements IField {
  private _fieldName: string;
  private _source: IVectorSource;
  private _origin: string;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IVectorSource;
    origin: string;
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
    return true;
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
    return this._fieldName;
  }

  async createTooltipProperty(): Promise<unknown> {
    throw new Error('must implement Field#createTooltipProperty');
  }

  getOrigin(): string {
    return this._origin;
  }

  supportsFieldMeta(): boolean {
    return false;
  }

  async getOrdinalFieldMetaRequest(/* config */): Promise<unknown> {
    return null;
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    return null;
  }
}
