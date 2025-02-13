/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { AggregateQuery, isOfAggregateQueryType, Query } from '@kbn/es-query';
import { EuiErrorBoundary } from '@elastic/eui';

const Bee = React.lazy(() => import('./bee'));

const ELK_BEE_REGEX = /^What\'s (an|(\d+)) elk bees?\?$/;

function Bees({ query }: { query?: Query }) {
  if (!query || typeof query !== 'object' || typeof query.query !== 'string') {
    return null;
  }
  const match = ELK_BEE_REGEX.exec(query.query);
  if (!match) {
    return null;
  }
  let amount = parseInt(match[2] || '1', 10);
  if (isNaN(amount)) {
    amount = 0;
  }
  amount = Math.max(1, Math.min(50, amount));
  return (
    <React.Suspense fallback={false}>
      {new Array(amount).fill(undefined).map((v, i) => (
        <Bee key={i} />
      ))}
    </React.Suspense>
  );
}

export function Easteregg(props: { query?: Query | AggregateQuery }) {
  if (isOfAggregateQueryType(props.query)) {
    return null;
  }
  return (
    // Do not break Lens for an easteregg
    <EuiErrorBoundary style={{ display: 'none' }}>
      <Bees query={props.query} />
    </EuiErrorBoundary>
  );
}
