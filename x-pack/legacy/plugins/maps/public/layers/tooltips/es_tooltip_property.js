/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TooltipProperty } from './tooltip_property';
import _ from 'lodash';
import { esFilters, HTML_CONTENT_TYPE } from '../../../../../../../src/plugins/data/public';

export class ESTooltipProperty extends TooltipProperty {
  constructor(propertyKey, propertyName, rawValue, indexPattern) {
    super(propertyKey, propertyName, rawValue);
    this._indexPattern = indexPattern;
  }

  getHtmlDisplayValue() {
    if (typeof this._rawValue === 'undefined') {
      return '-';
    }

    const field = this._indexPattern.fields.getByName(this._propertyName);
    if (!field) {
      return _.escape(this._rawValue);
    }
    const htmlConverter = field.format.getConverterFor(HTML_CONTENT_TYPE);
    return htmlConverter ? htmlConverter(this._rawValue) : field.format.convert(this._rawValue);
  }

  isFilterable() {
    const field = this._indexPattern.fields.getByName(this._propertyName);
    return (
      field &&
      (field.type === 'string' ||
        field.type === 'date' ||
        field.type === 'ip' ||
        field.type === 'number')
    );
  }

  async getESFilters() {
    return [
      esFilters.buildPhraseFilter(
        this._indexPattern.fields.getByName(this._propertyName),
        this._rawValue,
        this._indexPattern
      ),
    ];
  }
}
