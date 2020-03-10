/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD_ORIGIN } from '../../../common/constants';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';
import { ITooltipProperty, TooltipProperty } from '../tooltips/tooltip_property';
import { COLOR_PALETTE_MAX_SIZE } from '../../../common/constants';
// @ts-ignore
import { indexPatternService } from '../../kibana_services';
import { IFieldType } from '../../../../../../../src/plugins/data/public';
import { IField } from './field';
import { IESSource } from '../sources/es_source';
import { IVectorSource } from '../sources/vector_source';

export class ESDocField implements IField {
  static type = 'ES_DOC';

  private readonly _fieldName: string;
  private readonly _source: IESSource;
  private readonly _origin: FIELD_ORIGIN;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IESSource;
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
    return true;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  isValid(): boolean {
    return !!this._fieldName;
  }

  getOrigin(): FIELD_ORIGIN {
    return this._origin;
  }

  async getLabel(): Promise<string> {
    return this._fieldName;
  }

  async _getIndexPatternField(): Promise<IFieldType | undefined> {
    const indexPattern = await this._source.getIndexPattern();
    const indexPatternField = indexPattern.fields.getByName(this._fieldName);
    return indexPatternField && indexPatternService.isNestedField(indexPatternField)
      ? undefined
      : indexPatternField;
  }

  async createTooltipProperty(value: string | undefined): Promise<ITooltipProperty> {
    const indexPattern = await this._source.getIndexPattern();
    const tooltipProperty = new TooltipProperty(this.getName(), await this.getLabel(), value);
    return new ESTooltipProperty(tooltipProperty, indexPattern, this as IField);
  }

  async getDataType(): Promise<string> {
    const indexPatternField = await this._getIndexPatternField();
    return indexPatternField ? indexPatternField.type : '';
  }

  supportsFieldMeta(): boolean {
    return true;
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    const indexPatternField = await this._getIndexPatternField();

    if (
      !indexPatternField ||
      (indexPatternField.type !== 'number' && indexPatternField.type !== 'date')
    ) {
      return null;
    }

    const extendedStats: any = {};
    if (indexPatternField.scripted) {
      extendedStats.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      extendedStats.field = this._fieldName;
    }
    return {
      [this._fieldName]: {
        extended_stats: extendedStats,
      },
    };
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    const indexPatternField = await this._getIndexPatternField();
    if (!indexPatternField) {
      return null;
    }

    const topTerms: any = {
      size: COLOR_PALETTE_MAX_SIZE - 1, // need additional color for the "other"-value
    };
    if (indexPatternField.scripted) {
      topTerms.script = {
        source: indexPatternField.script,
        lang: indexPatternField.lang,
      };
    } else {
      topTerms.field = this._fieldName;
    }
    return {
      [this._fieldName]: {
        terms: topTerms,
      },
    };
  }
}
