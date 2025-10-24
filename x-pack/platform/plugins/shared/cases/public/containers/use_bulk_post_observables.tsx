/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { MAX_OBSERVABLES_PER_CASE } from '../../common/constants';
import type { BulkAddObservablesRequest } from '../../common/types/api';
import { bulkPostObservables } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';
import { OBSERVABLE_MAX_REACHED } from './translations';

export const useBulkPostObservables = () => {
  const { showErrorToast, showInfoToast } = useCasesToast();

  return useMutation(
    (request: BulkAddObservablesRequest) => {
      return bulkPostObservables(request);
    },
    {
      mutationKey: casesMutationsKeys.bulkPostObservables,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
      onSuccess: (response) => {
        if (response.observables.length >= MAX_OBSERVABLES_PER_CASE) {
          showInfoToast(
            i18n.OBSERVABLE_BULK_CREATED,
            OBSERVABLE_MAX_REACHED(MAX_OBSERVABLES_PER_CASE)
          );
        }
      },
    }
  );
};

export type UseBulkPostObservables = ReturnType<typeof useBulkPostObservables>;
