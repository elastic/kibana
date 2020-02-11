/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useContext, useMemo } from 'react';
import { LoadingIndicatorContext } from '../context/LoadingIndicatorContext';
import { useComponentId } from './useComponentId';

export function useLoadingIndicator() {
  const { dispatchStatus } = useContext(LoadingIndicatorContext);
  const id = useComponentId();

  return useMemo(() => {
    return {
      setIsLoading: (loading: boolean) => {
        dispatchStatus({ id, isLoading: loading });
      }
    };
  }, [dispatchStatus, id]);
}
