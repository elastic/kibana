/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { IVectorSource } from '../sources/vector_source';
import { ITooltipProperty } from '../tooltips/tooltip_property';

export interface IField {
  getName(): string;
  getRootName(): string;
  canValueBeFormatted(): boolean;
  getLabel(): Promise<string>;
  getDataType(): Promise<string>;
  createTooltipProperty(value: string | undefined): Promise<ITooltipProperty>;
  getSource(): IVectorSource;
  getOrigin(): FIELD_ORIGIN;
  isValid(): boolean;
  getOrdinalFieldMetaRequest(): Promise<unknown>;
  getCategoricalFieldMetaRequest(): Promise<unknown>;
}
