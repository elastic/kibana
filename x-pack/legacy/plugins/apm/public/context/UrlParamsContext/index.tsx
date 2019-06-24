/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, {
  createContext,
  useMemo,
  useCallback,
  useRef,
  useState
} from 'react';
import { withRouter } from 'react-router-dom';
import { uniqueId } from 'lodash';
import { IUrlParams } from './types';
import { getParsedDate } from './helpers';
import { resolveUrlParams } from './resolveUrlParams';
import { UIFilters } from '../../../typings/ui-filters';

interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

function useUiFilters({ kuery, environment }: IUrlParams): UIFilters {
  return useMemo(() => ({ kuery, environment }), [kuery, environment]);
}

const defaultRefresh = (time: TimeRange) => {};

const UrlParamsContext = createContext({
  urlParams: {} as IUrlParams,
  refreshTimeRange: defaultRefresh,
  uiFilters: {} as UIFilters
});

const UrlParamsProvider: React.ComponentClass<{}> = withRouter(
  ({ location, children }) => {
    const refUrlParams = useRef(resolveUrlParams(location, {}));

    const [, forceUpdate] = useState('');

    const urlParams = useMemo(
      () =>
        resolveUrlParams(location, {
          start: refUrlParams.current.start,
          end: refUrlParams.current.end,
          rangeFrom: refUrlParams.current.rangeFrom,
          rangeTo: refUrlParams.current.rangeTo
        }),
      [location, refUrlParams.current]
    );

    refUrlParams.current = urlParams;

    const refreshTimeRange = useCallback(
      (timeRange: TimeRange) => {
        refUrlParams.current = {
          ...refUrlParams.current,
          start: getParsedDate(timeRange.rangeFrom),
          end: getParsedDate(timeRange.rangeTo, { roundUp: true })
        };

        forceUpdate(uniqueId());
      },
      [forceUpdate]
    );

    const uiFilters = useUiFilters(urlParams);

    const contextValue = useMemo(
      () => {
        return {
          urlParams,
          refreshTimeRange,
          uiFilters
        };
      },
      [urlParams, refreshTimeRange, uiFilters]
    );

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider, useUiFilters };
