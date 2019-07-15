/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CountIndexPatternColumn } from '../indexpattern';
import { DimensionPriority } from '../../types';
import { OperationDefinition } from '../operations';

export const countOperation: OperationDefinition<CountIndexPatternColumn> = {
  type: 'count',
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Count',
  }),
  isApplicableWithoutField: true,
  isApplicableForField: ({ aggregationRestrictions, type }) => {
    return false;
  },
  buildColumn(
    operationId: string,
    columns: {},
    suggestedOrder?: DimensionPriority
  ): CountIndexPatternColumn {
    return {
      operationId,
      label: i18n.translate('xpack.lens.indexPattern.countOf', {
        defaultMessage: 'Count of documents',
      }),
      dataType: 'number',
      operationType: 'count',
      suggestedOrder,
      isBucketed: false,
    };
  },
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'count',
    schema: 'metric',
    params: {},
  }),
};
