/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractField } from './field';
import { TooltipProperty } from '../tooltips/tooltip_property';

export class TopTermPercentageField extends AbstractField {
  constructor(topTermAggField) {
    super({ source: topTermAggField.getSource(), origin: topTermAggField.getOrigin() });
    this._topTermAggField = topTermAggField;
  }

  getName() {
    return `${this._topTermAggField.getName()}_percentage`;
  }

  getRootName() {
    return '';
  }

  async getLabel() {
    return 'Top term percentage';
  }

  isValid() {
    return this._topTermAggField.isValid();
  }

  async getDataType() {
    return 'number';
  }

  async createTooltipProperty(value) {
    return new TooltipProperty(this.getName(), await this.getLabel(), value);
  }

  getValueAggDsl() {
    return null;
  }

  getBucketCount() {
    return 0;
  }

  supportsFieldMeta() {
    return false;
  }

  canValueBeFormatted() {
    return false;
  }
}
