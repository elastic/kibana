/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AbstractField, IField } from './field';
import { AggDescriptor } from  '../../../common/descriptor_types';
import { IESAggSource } from '../sources/es_agg_source';
import { ESDocField } from './es_doc_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../common/constants';
import { isMetricCountable } from '../util/is_metric_countable';
import { ESAggMetricTooltipProperty } from '../tooltips/es_aggmetric_tooltip_property';
import { getField, addFieldToDSL } from '../util/es_agg_utils';
import { TopTermPercentageField } from './top_term_percentage_field';
import { IIndexPattern } from 'src/plugins/data/public';

export interface IESAggField extends IField {
  getValueAggDsl(indexPattern: IIndexPattern): unknown;
  getBucketCount(): number;
}

export class ESAggField extends AbstractField implements IESAggField {
  static type = 'ES_AGG';

  private _label?: string;
  private _aggType: AGG_TYPE;
  private _esDocField?: unknown;

  constructor({
    label,
    source,
    aggType,
    esDocField,
    origin
  }: {
    label?: string,
    source: IESAggSource,
    aggType: AGG_TYPE,
    esDocField?: unknown,
    origin: FIELD_ORIGIN,
  }) {
    super({ source, origin });
    this._label = label;
    this._aggType = aggType;
    this._esDocField = esDocField;
  }

  getName(): string {
    return this._source.getAggKey(this.getAggType(), this.getRootName());
  }

  getRootName(): string {
    return this._getESDocFieldName();
  }

  async getLabel(): Promise<string> {
    return this._label
      ? this._label
      : this._source.getAggLabel(this.getAggType(), this.getRootName());
  }

  getAggType(): AGG_TYPE {
    return this._aggType;
  }

  isValid(): boolean {
    return this.getAggType() === AGG_TYPE.COUNT ? true : !!this._esDocField;
  }

  async getDataType(): Promise<string> {
    return this.getAggType() === AGG_TYPE.TERMS ? 'string' : 'number';
  }

  _getESDocFieldName(): unknown {
    return this._esDocField ? this._esDocField.getName() : '';
  }

  async createTooltipProperty(value: number | string): Promise<unknown> {
    const indexPattern = await this._source.getIndexPattern();
    return new ESAggMetricTooltipProperty(
      this.getName(),
      await this.getLabel(),
      value,
      indexPattern,
      this
    );
  }

  getValueAggDsl(indexPattern: IIndexPattern): unknown {
    if (this.getAggType() === AGG_TYPE.COUNT) {
      return null;
    }

    const field = getField(indexPattern, this.getRootName());
    const aggType = this.getAggType();
    const aggBody = aggType === AGG_TYPE.TERMS ? { size: 1, shard_size: 1 } : {};
    return {
      [aggType]: addFieldToDSL(aggBody, field),
    };
  }

  getBucketCount(): number {
    // terms aggregation increases the overall number of buckets per split bucket
    return this.getAggType() === AGG_TYPE.TERMS ? 1 : 0;
  }

  supportsFieldMeta(): boolean {
    // count and sum aggregations are not within field bounds so they do not support field meta.
    return !isMetricCountable(this.getAggType());
  }

  canValueBeFormatted(): boolean {
    // Do not use field formatters for counting metrics
    return ![AGG_TYPE.COUNT, AGG_TYPE.UNIQUE_COUNT].includes(this.getAggType());
  }

  async getOrdinalFieldMetaRequest(): Promise<unknown> {
    return this._esDocField.getOrdinalFieldMetaRequest();
  }

  async getCategoricalFieldMetaRequest(): Promise<unknown> {
    return this._esDocField.getCategoricalFieldMetaRequest();
  }
}

export function esAggFieldsFactory(aggDescriptor: AggDescriptor, source: IESAggSource, origin: FIELD_ORIGIN): IESAggField[] {
  const aggField = new ESAggField({
    label: aggDescriptor.label,
    esDocField: aggDescriptor.field
      ? new ESDocField({ fieldName: aggDescriptor.field, source })
      : null,
    aggType: aggDescriptor.type,
    source,
    origin,
  });

  const aggFields = [aggField];

  if (aggDescriptor.type === AGG_TYPE.TERMS) {
    aggFields.push(new TopTermPercentageField(aggField));
  }

  return aggFields;
}
