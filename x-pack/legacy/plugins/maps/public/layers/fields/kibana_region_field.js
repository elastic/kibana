/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';
import { TooltipProperty } from '../tooltips/tooltip_property';

export class KibanaRegionField extends AbstractField {

  static type = 'KIBANA_REGION';

  async getLabel() {
    const meta = await this._source.getVectorFileMeta();
    const field = meta.fields.find(f => f.name === this._fieldName);
    return field ? field.description : this._fieldName;
  }

  async createTooltipProperty(value) {
    const label = await this.getLabel();
    return new TooltipProperty(this.getName(), label, value);
  }
}
