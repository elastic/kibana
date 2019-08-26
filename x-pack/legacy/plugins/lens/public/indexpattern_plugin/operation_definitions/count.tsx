/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CountIndexPatternColumn } from '../indexpattern';
import { OperationDefinition } from '../operations';

const countLabel = i18n.translate('xpack.lens.indexPattern.countOf', {
  defaultMessage: 'Count of documents',
});

export const countOperation: OperationDefinition<CountIndexPatternColumn> = {
  type: 'count',
  displayName: i18n.translate('xpack.lens.indexPattern.count', {
    defaultMessage: 'Count',
  }),
  getPossibleOperationsForField: () => [],
  getPossibleOperationsForDocument: () => {
    return [
      {
        dataType: 'number',
        isBucketed: false,
        isMetric: true,
        scale: 'ratio',
      },
    ];
  },
  buildColumn({ suggestedPriority }) {
    return {
      label: countLabel,
      dataType: 'number',
      operationType: 'count',
      suggestedPriority,
      isBucketed: false,
      isMetric: true,
      scale: 'ratio',
    };
  },
  // This cannot be called practically, since this is a fieldless operation
  onFieldChange: oldColumn => ({ ...oldColumn }),
  toEsAggsConfig: (column, columnId) => ({
    id: columnId,
    enabled: true,
    type: 'count',
    schema: 'metric',
    params: {},
  }),
  isTransferable: () => {
    return true;
  },
};
