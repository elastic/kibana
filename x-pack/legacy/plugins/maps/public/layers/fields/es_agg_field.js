/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractField } from './field';
import { AGG_TYPE } from '../../../common/constants';
import { isMetricCountable } from '../util/is_metric_countable';
import { ESAggMetricTooltipProperty } from '../tooltips/es_aggmetric_tooltip_property';
import { getField, addFieldToDSL } from '../util/es_agg_utils';

export class ESAggMetricField extends AbstractField {
  static type = 'ES_AGG';

  constructor({ label, source, aggType, esDocField, origin }) {
    super({ source, origin });
    this._label = label;
    this._aggType = aggType;
    this._esDocField = esDocField;
  }

  getName() {
    return this._source.formatMetricKey(this.getAggType(), this.getESDocFieldName());
  }

  async getLabel() {
    return this._label
      ? await this._label
      : this._source.formatMetricLabel(this.getAggType(), this.getESDocFieldName());
  }

  getAggType() {
    return this._aggType;
  }

  isValid() {
    return this.getAggType() === AGG_TYPE.COUNT ? true : !!this._esDocField;
  }

  async getDataType() {
    return this.getAggType() === AGG_TYPE.TERMS ? 'string' : 'number';
  }

  getESDocFieldName() {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  getRequestDescription() {
    return this.getAggType() !== AGG_TYPE.COUNT
      ? `${this.getAggType()} ${this.getESDocFieldName()}`
      : AGG_TYPE.COUNT;
  }

  async createTooltipProperty(value) {
    const indexPattern = await this._source.getIndexPattern();
    return new ESAggMetricTooltipProperty(
      this.getName(),
      await this.getLabel(),
      value,
      indexPattern,
      this
    );
  }

  getValueAggDsl(indexPattern) {
    const field = getField(indexPattern, this.getESDocFieldName());
    const aggType = this.getAggType();
    const aggBody = aggType === AGG_TYPE.TERMS ? { size: 1, shard_size: 1 } : {};
    return {
      [aggType]: addFieldToDSL(aggBody, field),
    };
  }

  supportsFieldMeta() {
    // count and sum aggregations are not within field bounds so they do not support field meta.
    return !isMetricCountable(this.getAggType());
  }

  async getOrdinalFieldMetaRequest(config) {
    return this._esDocField.getOrdinalFieldMetaRequest(config);
  }

  async getCategoricalFieldMetaRequest() {
    return this._esDocField.getCategoricalFieldMetaRequest();
  }
}
