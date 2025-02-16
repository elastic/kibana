/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { initIncrementalId } from './api';
import * as i18n from './translations';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import { casesMutationsKeys } from './constants';

// TODO: see x-pack/platform/plugins/shared/cases/server/routes/api/internal/init_case_id_incrementer.ts
export const useInitIncrementalId = () => {
  const { showErrorToast } = useCasesToast();

  return useMutation(
    () => {
      return initIncrementalId();
    },
    {
      mutationKey: casesMutationsKeys.initIncrementalId,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );
};

export type UseInitIncrementalIds = ReturnType<typeof useInitIncrementalId>;
