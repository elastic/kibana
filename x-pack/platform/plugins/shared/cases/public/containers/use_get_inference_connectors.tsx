/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useToasts } from '../common/lib/kibana';
import { getInferenceConnectors } from './api';
import type { ServerError } from '../types';
import { ERROR_TITLE } from './translations';
import { inferenceKeys } from './constants';
import type { InferenceConnectors } from './types';

export const useGetInferenceConnectors = () => {
  const toasts = useToasts();
  return useQuery<InferenceConnectors, ServerError>(
    inferenceKeys.getConnectors(),
    async ({ signal }) => getInferenceConnectors(signal),
    {
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: ERROR_TITLE }
          );
        }
      },
    }
  );
};

export type UseGetInferenceConnectors = ReturnType<typeof useGetInferenceConnectors>;
