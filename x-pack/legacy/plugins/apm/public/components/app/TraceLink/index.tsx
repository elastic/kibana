/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import moment from 'moment-timezone';
import { template, templateSettings } from 'lodash';
import styled from 'styled-components';
import { Redirect } from 'react-router-dom';
import { useFetcher } from '../../../hooks/useFetcher';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { convertTo, getDateDifference } from '../../../utils/formatters';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';
import { routes } from '../Main/route_config';
import { RouteName } from '../Main/route_config/route_names';

interface RedirectType {
  pathname: string;
  search: string;
}

const CentralizedContainer = styled.div`
  height: 100%;
  display: flex;
`;

const getPathName = (routeName: string, pathParms?: object) => {
  const route = routes.find(({ name }) => name === routeName);
  if (route && route.path) {
    const { path } = route;
    // Matches any string with ':param/'
    templateSettings.interpolate = /:([\s\S].+?(?=\/))/;
    return pathParms ? template(path)(pathParms) : path;
  }

  return '/';
};

const redirectToTransactionDetailPage = (
  traceId: string,
  transaction: Transaction
): RedirectType => {
  const pathname = getPathName(RouteName.TRANSACTION_NAME, {
    serviceName: transaction.service.name
  });

  const {
    id: transactionId,
    name: transactionName,
    type: transactionType
  } = transaction.transaction;

  let search = `?traceId=${traceId}&transactionId=${transactionId}&transactionName=${transactionName}&transactionType=${transactionType}`;

  const diff = getDiffDays(transaction.timestamp.us);
  if (diff > 0) {
    search = `${search}&rangeFrom=now-${diff}d&rangeTo=now`;
  }
  return { pathname, search };
};

const getDiffDays = (microseconds: number) => {
  const start = moment(
    convertTo({
      unit: 'milliseconds',
      microseconds
    }).convertedValue
  );

  return getDateDifference(start, moment(), 'days');
};

const redirectToTracePage = (traceId: string): RedirectType => ({
  pathname: getPathName(RouteName.TRACES),
  search: `?kuery=${encodeURIComponent(`trace.id : "${traceId}"`)}`
});

export const TraceLink = () => {
  const { urlParams } = useUrlParams();
  const { traceIdLink: traceId } = urlParams;
  const { data } = useFetcher(
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

  if (traceId && data) {
    let to: RedirectType;
    if (data.total.value === 0) {
      to = redirectToTracePage(traceId);
    } else {
      to = redirectToTransactionDetailPage(traceId, data.hits[0]._source);
    }

    return <Redirect to={to} />;
  }

  return (
    <CentralizedContainer>
      <EuiEmptyPrompt iconType="apmTrace" title={<h2>Fetching trace...</h2>} />
    </CentralizedContainer>
  );
};
