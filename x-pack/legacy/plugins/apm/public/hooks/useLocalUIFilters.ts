/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useMemo, useCallback } from 'react';
import { pick, omit, mapValues } from 'lodash';
import { useFetcher } from './useFetcher';
import { callApi } from '../services/rest/callApi';
import { LocalUIFiltersAPIResponse } from '../../server/lib/ui_filters/local_ui_filters';
import { useUrlParams } from './useUrlParams';
import { LocalUIFilterName } from '../../server/lib/ui_filters/local_ui_filters/config';
import { history } from '../utils/history';
import { toQuery, fromQuery } from '../components/shared/Links/url_helpers';
import { removeUndefinedProps } from '../context/UrlParamsContext/helpers';
import { PROJECTION } from '../projections/typings';
import { UIFilters } from '../../typings/ui-filters';

const initialData = [] as LocalUIFiltersAPIResponse;

export const useLocalUIFilters = ({
  projection,
  filterNames,
  params
}: {
  projection: PROJECTION;
  filterNames: LocalUIFilterName[];
  params?: Record<string, string | number | boolean | undefined>;
}) => {
  const { uiFilters, urlParams } = useUrlParams();

  const values = useMemo(() => {
    return pick(uiFilters, filterNames) as Pick<UIFilters, LocalUIFilterName>;
  }, [uiFilters, filterNames]);

  const setValues = useCallback(
    (vals: typeof values) => {
      const search = omit(toQuery(history.location.search), filterNames);

      history.push({
        ...history.location,
        search: fromQuery(
          removeUndefinedProps({
            ...search,
            ...mapValues(vals, val =>
              val && val.length ? val.join(',') : undefined
            )
          })
        )
      });
    },
    [filterNames, values]
  );

  const { data = initialData, status } = useFetcher(async () => {
    const foo = await callApi<LocalUIFiltersAPIResponse>({
      method: 'GET',
      pathname: `/api/apm/ui_filters/local_filters/${projection}`,
      query: {
        uiFilters: JSON.stringify(uiFilters),
        start: urlParams.start,
        end: urlParams.end,
        filterNames: JSON.stringify(filterNames),
        ...params
      }
    });
    return foo;
  }, [uiFilters, urlParams, params, filterNames, projection]);

  return useMemo(
    () => ({
      data,
      status,
      values,
      setValues
    }),
    [data, status, values, setValues]
  );
};
