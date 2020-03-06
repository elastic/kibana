/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { ITooltipProperty } from './tooltip_property';
import { IField } from '../fields/field';
import { esFilters, IFieldType, IndexPattern } from '../../../../../../../src/plugins/data/public';

export class ESTooltipProperty implements ITooltipProperty {
  private _tooltipProperty: ITooltipProperty;
  private _indexPattern: IndexPattern;
  private _field: IField;

  constructor(tooltipProperty: ITooltipProperty, indexPattern: IndexPattern, field: IField) {
    this._tooltipProperty = tooltipProperty;
    this._indexPattern = indexPattern;
    this._field = field;
  }

  getPropertyKey(): string {
    return this._tooltipProperty.getPropertyKey();
  }

  getPropertyName(): string {
    return this._tooltipProperty.getPropertyName();
  }

  getRawValue(): string | undefined {
    return this._tooltipProperty.getRawValue();
  }

  _getIndexPatternField(): IFieldType | undefined {
    return this._indexPattern.fields.getByName(this._field.getRootName());
  }

  getHtmlDisplayValue(): string {
    if (typeof this.getRawValue() === 'undefined') {
      return '-';
    }

    const indexPatternField = this._getIndexPatternField();
    if (!indexPatternField || !this._field.canValueBeFormatted()) {
      return _.escape(this.getRawValue());
    }

    const htmlConverter = indexPatternField.format.getConverterFor('html');
    return htmlConverter
      ? htmlConverter(this.getRawValue())
      : indexPatternField.format.convert(this.getRawValue());
  }

  isFilterable(): boolean {
    const field = this._getIndexPatternField();
    return (
      field &&
      (field.type === 'string' ||
        field.type === 'date' ||
        field.type === 'ip' ||
        field.type === 'number')
    );
  }

  async getESFilters(): Promise<unknown> {
    return [
      esFilters.buildPhraseFilter(
        this._getIndexPatternField(),
        this.getRawValue(),
        this._indexPattern
      ),
    ];
  }
}
