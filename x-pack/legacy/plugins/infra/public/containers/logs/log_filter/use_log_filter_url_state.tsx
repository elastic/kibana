/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useEffect } from 'react';
import * as rt from 'io-ts';
import { LogFilterState } from './log_filter_state';
import { replaceStateKeyInQueryString } from '../../../utils/url_state';
import { useUrlState } from '../../../utils/use_url_state';
import { getEncodeDecodeFromRT } from '../../../utils/validate_url_rt';

const logFilterRT = rt.union([
  rt.type({
    kind: rt.literal('kuery'),
    expression: rt.string,
  }),
  rt.undefined,
]);
type LogFilterUrlState = rt.TypeOf<typeof logFilterRT>;

const LOG_FILTER_URL_STATE_KEY = 'logFilter';

export const useLogFilterUrlState = () => {
  const { filterQueryAsKuery, applyLogFilterQuery } = useContext(LogFilterState.Context);
  const [logFilterUrlState, setLogFilterUrlState] = useUrlState({
    defaultState: filterQueryAsKuery,
    urlStateKey: LOG_FILTER_URL_STATE_KEY,
    writeDefaultState: true,
    ...getEncodeDecodeFromRT(logFilterRT),
  });

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (logFilterUrlState && filterQueryAsKuery?.expression !== logFilterUrlState.expression) {
      applyLogFilterQuery(logFilterUrlState.expression);
    }
  }, [logFilterUrlState]);
  useEffect(() => setLogFilterUrlState(filterQueryAsKuery), [filterQueryAsKuery]);
  /* eslint-enable react-hooks/exhaustive-deps */
};

export const replaceLogFilterInQueryString = (expression: string) =>
  replaceStateKeyInQueryString<LogFilterUrlState>('logFilter', {
    kind: 'kuery',
    expression,
  });
