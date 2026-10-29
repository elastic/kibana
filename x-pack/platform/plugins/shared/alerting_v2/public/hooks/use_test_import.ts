/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type { TestImportResponse } from '@kbn/alerting-v2-schemas';
import { ImportsApi } from '../services/imports_api';
import { importKeys } from './query_key_factory';

/** POC: sends a sample payload through the import's workflow. This writes a real alert. */
export const useTestImport = () => {
  const importsApi = useService(ImportsApi);
  const queryClient = useQueryClient();

  return useMutation<TestImportResponse, Error, string>({
    mutationFn: (id) => importsApi.testImport(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.all, exact: false });
    },
  });
};
