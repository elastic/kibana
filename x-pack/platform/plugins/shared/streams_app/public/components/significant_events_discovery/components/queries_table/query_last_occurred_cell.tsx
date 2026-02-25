/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { useFetchQueryOccurrencesChartData } from '../../../../hooks/use_fetch_queries_occurrences_chart_data';
import { formatLastOccurredAt } from './utils';

export function QueryLastOccurredCell({ queryId }: { queryId: string }) {
  const { data: queryOccurrencesChartData } = useFetchQueryOccurrencesChartData({ queryId });

  return (
    <EuiText size="s">{formatLastOccurredAt(queryOccurrencesChartData?.buckets ?? [])}</EuiText>
  );
}
