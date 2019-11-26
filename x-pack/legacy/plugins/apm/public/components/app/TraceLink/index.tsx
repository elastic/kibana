/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import url from 'url';
import styled from 'styled-components';
import { Redirect } from 'react-router-dom';
import { useFetcher, FETCH_STATUS } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

const redirectToTransactionDetailPage = (transaction: Transaction) =>
  url.format({
    pathname: `/services/${transaction.service.name}/transactions/view`,
    query: {
      traceId: transaction.trace.id,
      transactionId: transaction.transaction.id,
      transactionName: transaction.transaction.name,
      transactionType: transaction.transaction.type
    }
  });

const redirectToTracePage = (traceId: string) =>
  url.format({
    pathname: `/traces`,
    query: {
      kuery: encodeURIComponent(`trace.id : "${traceId}"`)
    }
  });

export const TraceLink = () => {
  const { urlParams } = useUrlParams();
  const { traceIdLink: traceId } = urlParams;

  const { data = { transaction: null }, status } = useFetcher(
    callApmApi => {
      if (traceId) {
        return callApmApi({
          pathname: '/api/apm/transaction/{traceId}',
          params: {
            path: {
              traceId
            }
          }
        });
      }
    },
    [traceId]
  );
  if (traceId && status === FETCH_STATUS.SUCCESS) {
    const to = data.transaction
      ? redirectToTransactionDetailPage(data.transaction)
      : redirectToTracePage(traceId);
    return <Redirect to={to} />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt iconType="apmTrace" title={<h2>Fetching trace...</h2>} />
    </CentralizedContainer>
  );
};
