/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { URLParamsFilter } from '../URLParamsFilter';

interface Props {
  transactionTypes: string[];
}

const TransactionTypeFilter = ({ transactionTypes }: Props) => {
  const options = transactionTypes.map(type => ({
    text: type,
    value: type
  }));

  return (
    <URLParamsFilter
      title={i18n.translate('xpack.apm.localFilters.titles.transactionType', {
        defaultMessage: 'Transaction type'
      })}
      options={options}
      urlParamKey="transactionType"
    />
  );
};

export { TransactionTypeFilter };
