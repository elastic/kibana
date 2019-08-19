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
import { uniqueId, mapValues } from 'lodash';
import { IUrlParams } from './types';
import { getParsedDate } from './helpers';
import { resolveUrlParams } from './resolveUrlParams';
import { UIFilters } from '../../../typings/ui-filters';
import {
  localUIFilterNames,
  LocalUIFilterName
} from '../../../server/lib/ui_filters/local_ui_filters/config';
import { pickKeys } from '../../utils/pickKeys';

interface TimeRange {
  rangeFrom: string;
  rangeTo: string;
}

function useUiFilters(
  params: Pick<IUrlParams, 'kuery' | 'environment' | LocalUIFilterName>
): UIFilters {
  return useMemo(() => {
    const { kuery, environment, ...localUIFilters } = params;
    const mappedLocalFilters = mapValues(
      pickKeys(localUIFilters, ...localUIFilterNames),
      val => (val ? val.split(',') : [])
    ) as Partial<Record<LocalUIFilterName, string[]>>;

    return { kuery, environment, ...mappedLocalFilters };
  }, [params]);
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

    const { start, end, rangeFrom, rangeTo } = refUrlParams.current;

    const [, forceUpdate] = useState('');

    const urlParams = useMemo(
      () =>
        resolveUrlParams(location, {
          start,
          end,
          rangeFrom,
          rangeTo
        }),
      [location, start, end, rangeFrom, rangeTo]
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

    const contextValue = useMemo(() => {
      return {
        urlParams,
        refreshTimeRange,
        uiFilters
      };
    }, [urlParams, refreshTimeRange, uiFilters]);

    return (
      <UrlParamsContext.Provider children={children} value={contextValue} />
    );
  }
);

export { UrlParamsContext, UrlParamsProvider, useUiFilters };
