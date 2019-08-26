/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/Transaction';
import { APMLink } from './APMLink';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { pickKeys } from '../../../../utils/pickKeys';

interface TransactionLinkProps {
  transaction: Transaction | undefined;
}

export const TransactionLink: React.SFC<TransactionLinkProps> = ({
  transaction,
  children
}) => {
  const { urlParams } = useUrlParams();

  if (!transaction) {
    return null;
  }

  const serviceName = transaction.service.name;
  const traceId = transaction.trace.id;
  const transactionId = transaction.transaction.id;
  const transactionName = transaction.transaction.name;
  const transactionType = transaction.transaction.type;

  const persistedFilters = pickKeys(urlParams, 'transactionResult');

  return (
    <APMLink
      path={`/services/${serviceName}/transactions/view`}
      query={{
        traceId,
        transactionId,
        transactionName,
        transactionType,
        ...persistedFilters
      }}
    >
      {children}
    </APMLink>
  );
};
