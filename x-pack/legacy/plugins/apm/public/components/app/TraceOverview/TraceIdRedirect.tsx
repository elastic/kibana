/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Redirect, RouteComponentProps } from 'react-router-dom';
import {
  legacyEncodeURIComponent,
  fromQuery
} from '../../shared/Links/url_helpers';
import { useFetcher, FETCH_STATUS } from '../../../hooks/useFetcher';
import { loadTrace } from '../../../services/rest/apm/traces';
import { useUrlParams } from '../../../hooks/useUrlParams';
import { Transaction } from '../../../../typings/es_schemas/ui/Transaction';

type Props = RouteComponentProps<{ id: string }>;

// TODO why are start and end required for an ID-based search? i.e. we want _all_ the docs that match that ID...
export function linkToTraceId({
  traceId,
  start,
  end
}: {
  traceId: string;
  start: string;
  end: string;
}) {
  // TODO handle base path in these shared link functions
  // TODO export this from a shared place, either apm/public/index or observability/public/index
  return `/app/apm#/traces/${traceId}?rangeFrom=${start}&rangeTo=${end}`;
}

export function TraceIdRedirect({ match }: Props) {
  const { urlParams } = useUrlParams();
  const { start, end } = urlParams;

  const { id: traceId } = match.params;
  if (!traceId || !start || !end) {
    return null; // TODO handle error state where inbound link did not provide correct params
  }

  const { data, status, error } = useFetcher(
    () => loadTrace({ traceId, start, end }),
    [traceId, start, end]
  );

  if (!data || status === FETCH_STATUS.LOADING) {
    return null; // TODO handle loading state
  }

  if (error || !data.trace || !data.trace[0]) {
    return null; // TODO handle bad data or error state
  }

  const trace = data.trace[0] as Transaction;

  if (!trace.transaction.name) {
    return null; // TODO handle case where trace root is a span instead of a transaction
  }

  const query = fromQuery({ traceId, rangeFrom: start, rangeTo: end });
  const { service, transaction } = trace;
  const type = legacyEncodeURIComponent(transaction.type);
  const name = legacyEncodeURIComponent(transaction.name);
  const pathname = `/${service.name}/transactions/${type}/${name}?${query}`;

  return <Redirect to={pathname} />;
}
