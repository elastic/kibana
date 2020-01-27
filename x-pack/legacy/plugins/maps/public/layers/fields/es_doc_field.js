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
    return indexPattern.fields.getByName(this._fieldName);
  }

  async createTooltipProperty(value) {
    const indexPattern = await this._source.getIndexPattern();
    return new ESTooltipProperty(this.getName(), this.getName(), value, indexPattern);
  }

  async getDataType() {
    const field = await this._getField();
    return field.type;
  }

  supportsFieldMeta() {
    return true;
  }

  async getFieldMetaRequest(/* config */) {
    const field = await this._getField();

    if (field.type !== 'number' && field.type !== 'date') {
      return null;
    }

    const extendedStats = {};
    if (field.scripted) {
      extendedStats.script = {
        source: field.script,
        lang: field.lang,
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
}
