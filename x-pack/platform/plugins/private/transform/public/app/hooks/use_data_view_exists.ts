/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import type { ErrorType } from '@kbn/ml-error-utils';

import { TRANSFORM_REACT_QUERY_KEYS } from '../../../common/constants';

import { useAppDependencies } from '../app_dependencies';
import type { TransformListRow } from '../common';

export const useDataViewExists = (items: TransformListRow[]) => {
  const {
    data: { dataViews: dataViewsContract },
  } = useAppDependencies();

  return useQuery<boolean, ErrorType>(
    [TRANSFORM_REACT_QUERY_KEYS.DATA_VIEW_EXISTS, items],
    async () => {
      if (items.length !== 1) {
        return false;
      }
      const config = items[0].config;
      const indexName = config.dest.index;

      if (indexName === undefined) {
        return false;
      }

      return (await dataViewsContract.find(indexName)).some(({ title }) => title === indexName);
    }
  );
};
