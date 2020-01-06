/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import React, { useState, useEffect } from 'react';

import { useQuerySignals } from '../../../../containers/detection_engine/signals/use_query';
import { buildlastSignalsQuery } from './query.dsl';
import { Aggs } from './types';

interface SignalInfo {
  ruleId?: string | null;
}

type Return = [React.ReactNode, React.ReactNode];

export const useSignalInfo = ({ ruleId = null }: SignalInfo): Return => {
  const [lastSignals, setLastSignals] = useState<React.ReactElement | null>(
    <EuiLoadingSpinner size="m" />
  );
  const [totalSignals, setTotalSignals] = useState<React.ReactElement | null>(
    <EuiLoadingSpinner size="m" />
  );

  let query = '';
  try {
    query = JSON.stringify(buildlastSignalsQuery(ruleId));
  } catch {
    query = '';
  }

  const [loading, signals] = useQuerySignals<unknown, Aggs>(query);

  useEffect(() => {
    if (signals != null) {
      const mySignals = signals;
      setLastSignals(
        mySignals.aggregations?.lastSeen.value != null ? (
          <FormattedRelative
            value={new Date(mySignals.aggregations?.lastSeen.value_as_string ?? '')}
          />
        ) : null
      );
      setTotalSignals(<>{mySignals.hits.total.value}</>);
    } else {
      setLastSignals(null);
      setTotalSignals(null);
    }
  }, [loading, signals]);

  return [lastSignals, totalSignals];
};
