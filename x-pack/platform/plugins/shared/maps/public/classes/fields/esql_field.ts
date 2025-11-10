/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import type { ESQLColumn } from '@kbn/es-types';
import type { DataView } from '@kbn/data-plugin/common';
import type { FIELD_ORIGIN } from '../../../common/constants';
import type { IField } from './field';
import { AbstractField } from './field';
import type { IVectorSource } from '../sources/vector_source';
import type { ESQLSource } from '../sources/esql_source';
import { getData } from '../../kibana_services';
import type { ITooltipProperty } from '../tooltips/tooltip_property';
import { TooltipProperty } from '../tooltips/tooltip_property';
import { ESTooltipProperty } from '../tooltips/es_tooltip_property';

export class ESQLField extends AbstractField implements IField {
  private readonly _source: IVectorSource & Pick<ESQLSource, 'getESQL' | 'getIndexPattern'>;

  constructor({
    fieldName,
    source,
    origin,
  }: {
    fieldName: string;
    source: IVectorSource & Pick<ESQLSource, 'getESQL' | 'getIndexPattern'>;
    origin: FIELD_ORIGIN;
  }) {
    super({ fieldName, origin });
    this._source = source;
  }

  supportsFieldMetaFromEs(): boolean {
    return false;
  }

  supportsFieldMetaFromLocalData(): boolean {
    return true;
  }

  getSource(): IVectorSource {
    return this._source;
  }

  async getDataType(): Promise<string> {
    const columns = await getESQLQueryColumnsRaw({
      esqlQuery: this._source.getESQL(),
      search: getData().search.search,
      timeRange: getData().query.timefilter.timefilter.getAbsoluteTime(),
    });
    const column = columns.find(({ name }) => name === this.getName());
    return getFieldType(column) ?? 'string';
  }

  async createTooltipProperty(value: string | string[] | undefined): Promise<ITooltipProperty> {
    let dataView: DataView | undefined;
    try {
      dataView = await this._source.getIndexPattern();
    } catch (e) {
      // fall back to displaying raw feature properties in tooltip
      // when unable to create adhoc data view
    }
    const tooltipProperty = new TooltipProperty(this.getName(), this.getName(), value);
    return dataView?.getFieldByName(this.getName()) !== undefined
      ? new ESTooltipProperty(
          tooltipProperty,
          dataView,
          this as IField,
          this._source.getApplyGlobalQuery()
        )
      : tooltipProperty;
  }
}

/*
 * Map column.type to field type
 * Supported column types https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-limitations.html#_supported_types
 */
function getFieldType(column?: ESQLColumn) {
  if (!column) return undefined;
  switch (column.type) {
    case 'boolean':
    case 'date':
    case 'ip':
    case 'keyword':
    case 'text':
      return 'string';
    case 'double':
    case 'int':
    case 'long':
    case 'unsigned_long':
      return 'number';
    default:
      return undefined;
  }
}
