/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { AbstractField } from './field';
import { TooltipProperty } from '../tooltips/tooltip_property';

//todo: rename to ESMFileField
export class EMSRegionLayerField extends AbstractField {
  static type = 'EMS_REGION_LAYER';

  async getLabel() {
    const emsFileLayer = await this._source.getEMSFileLayer();
    const emsFields = emsFileLayer.getFieldsInLanguage();
    // Map EMS field name to language specific label
    const emsField = emsFields.find(field => field.name === this.getName());
    return emsField ? emsField.description : this.getName();
  }

  async createTooltipProperty(value) {
    const label = await this.getLabel();
    return new TooltipProperty(this.getName(), label, value);
  }
}
