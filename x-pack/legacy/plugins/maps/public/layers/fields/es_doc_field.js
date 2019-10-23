/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';

export class ESDocField extends AbstractField {

  static type = 'ES_DOC';

  async _getField() {
    const indexPattern = await this._source.getIndexPattern();
    return indexPattern.fields.find((field) => field.name === this._fieldName);
  }

  async createTooltipProperty(value) {
    try {
      const indexPattern = await this._source.getIndexPattern();
      if (!indexPattern) {
        return null;
      }
      return new ESTooltipProperty(this.getName(), this.getName(), value, indexPattern);
    } catch (e) {
      return null;
    }
  }

  async getType() {
    const field = await this._getField();
    return field.type;
  }

}
