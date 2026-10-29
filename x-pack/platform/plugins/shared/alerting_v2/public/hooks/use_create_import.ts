/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { useService } from '@kbn/core-di-browser';
import type { CreateAnyImportData, CreateImportResponse } from '@kbn/alerting-v2-schemas';
import { ImportsApi } from '../services/imports_api';
import { importKeys } from './query_key_factory';

/**
 * POC: creates a custom import (connector, workflow and config) or a managed one (config only) in
 * one request. Errors are not toasted here
 * because the setup flyout renders the server message and the failed step inline.
 */
export const useCreateImport = () => {
  const importsApi = useService(ImportsApi);
  const queryClient = useQueryClient();

  return useMutation<CreateImportResponse, Error, CreateAnyImportData>({
    mutationFn: (data) => importsApi.createImport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: importKeys.all, exact: false });
    },
  });
};
