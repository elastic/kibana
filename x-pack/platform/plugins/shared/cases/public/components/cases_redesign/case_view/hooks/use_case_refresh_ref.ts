/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { CaseViewProps } from '../../../case_view/types';
import { useRefreshCaseViewPage } from '../../../case_view/use_on_refresh_case_view_page';

interface UseCaseRefreshRefArgs {
  refreshRef: CaseViewProps['refreshRef'];
  isLoading: boolean;
}

/**
 * Ported from the original CaseViewPage component.
 * Exposes a `refreshCase` callback via the provided ref so parent components
 * can imperatively trigger a case data refresh. Guards against calls when
 * the component is unmounted (isStale) or already loading.
 */
export const useCaseRefreshRef = ({ refreshRef, isLoading }: UseCaseRefreshRefArgs) => {
  const refreshCaseViewPage = useRefreshCaseViewPage();

  useEffect(() => {
    let isStale = false;
    if (refreshRef) {
      refreshRef.current = {
        refreshCase: async () => {
          if (isStale || isLoading) {
            return;
          }
          refreshCaseViewPage();
        },
      };
      return () => {
        isStale = true;
        refreshRef.current = null;
      };
    }
  }, [isLoading, refreshRef, refreshCaseViewPage]);
};
