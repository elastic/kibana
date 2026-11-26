/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewField } from '@kbn/data-views-plugin/public';
import { ES_FIELD_TYPES } from '@kbn/field-types';

/** Returns whether a data-view field can be aggregated as a change point metric. */
export const isChangePointMetricField = (field: DataViewField): boolean =>
  Boolean(field.aggregatable && field.type === 'number');

/** Returns whether a data-view field can be used to split change point series. */
export const isChangePointSplitField = (field: DataViewField): boolean =>
  Boolean(
    field.aggregatable &&
      field.esTypes?.some((esType) =>
        [ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.IP].includes(esType as ES_FIELD_TYPES)
      ) &&
      !['_id', '_index'].includes(field.displayName)
  );

/** Excludes scripted and Kibana data-view runtime fields, which ES|QL cannot query. */
export const isEsqlCompatibleField = (field: DataViewField): boolean =>
  !field.scripted && !field.runtimeField && field.isMapped !== false;
