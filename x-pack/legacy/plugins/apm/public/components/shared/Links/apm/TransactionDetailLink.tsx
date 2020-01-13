/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { APMLink, APMLinkExtendProps } from './APMLink';
import { useUrlParams } from '../../../../hooks/useUrlParams';
import { pickKeys } from '../../../../utils/pickKeys';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  traceId: string;
  transactionId: string;
  transactionName: string;
  transactionType: string;
}

export const TransactionDetailLink = ({
  serviceName,
  traceId,
  transactionId,
  transactionName,
  transactionType,
  ...rest
}: Props) => {
  const { urlParams } = useUrlParams();

  const persistedFilters = pickKeys(
    urlParams,
    'transactionResult',
    'serviceVersion'
  );

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
      {...rest}
    />
  );
};
