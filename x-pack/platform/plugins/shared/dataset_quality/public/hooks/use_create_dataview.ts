/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibanaContextForPlugin } from '../utils';

interface UseCreateDataViewProps {
  indexPatternString: string | undefined;
}

export function useCreateDataView({ indexPatternString }: UseCreateDataViewProps) {
  const {
    services: { dataViews },
  } = useKibanaContextForPlugin();

  const [stateDataView, setStateDataView] = useState<DataView | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const retrieveOrCreateDataView = async (indexPattern: string) => {
      const existingDataView = await dataViews.getIdsWithTitle();
      const foundDataView = existingDataView.find((dv) => dv.title === indexPattern);
      if (foundDataView) {
        return dataViews.get(foundDataView.id);
      }

      // Create an ad-hoc data view
      return dataViews.create({
        id: `${indexPatternString}-id`,
        title: indexPatternString,
        allowNoIndex: true,
        timeFieldName: '@timestamp',
      });
    };

    if (indexPatternString) {
      setIsLoading(true);

      retrieveOrCreateDataView(indexPatternString)
        .then((value) => {
          setStateDataView(value);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [indexPatternString, dataViews]);

  return { dataView: stateDataView, loading: isLoading };
}
