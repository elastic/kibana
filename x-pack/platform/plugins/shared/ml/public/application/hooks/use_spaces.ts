/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useManagementApiService } from '../services/ml_api_service/management';
import { useEnabledFeatures } from '../contexts/ml/serverless_context';
import type { MlSavedObjectType } from '../../../common/types/saved_objects';

export const useSpacesInfo = (currentTabId: MlSavedObjectType) => {
  const { getList } = useManagementApiService();

  const [items, setItems] = useState<ManagementListResponse>();
  const [filters, setFilters] = useState<SearchFilterConfig[] | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { isADEnabled, isDFAEnabled, isNLPEnabled } = useEnabledFeatures();

  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadingTab = useRef<MlSavedObjectType | null>(null);
  const refresh = useCallback(
    (tabId: MlSavedObjectType | null) => {
      if (tabId === null) {
        return;
      }

      loadingTab.current = tabId;
      setIsLoading(true);
      getList(tabId)
        .then((jobList) => {
          if (isMounted.current && tabId === loadingTab.current) {
            setItems(jobList);
            setIsLoading(false);
            setFilters(getFilters(tabId, jobList));
          }
        })
        .catch(() => {
          if (isMounted.current) {
            setItems([]);
            setFilters(undefined);
            setIsLoading(false);
          }
        });
    },
    [getList, loadingTab]
  );
  useEffect(() => {
    refresh(currentTabId);
  }, [currentTabId, refresh]);

  return {
    items,
    isLoading,
  };
  // useEffect(() => {
  //   onReload(() => () => refresh(currentTabId));
  //   return () => {
  //     onReload(null);
  //   };
  // }, [currentTabId, refresh, onReload]);
};
