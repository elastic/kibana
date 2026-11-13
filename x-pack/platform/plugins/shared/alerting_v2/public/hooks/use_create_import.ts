/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { WorkflowApi } from '@kbn/workflows-ui';
import { createImport } from '../components/imports/create_import';
import type { CreatedImport, ImportSetupError } from '../components/imports/create_import';
import type { ImportFormState } from '../components/imports/import_form';
import { importKeys } from './query_key_factory';

/** Creates the connector, token and workflow of a custom import. */
export const useCreateImport = () => {
  const http = useService(CoreStart('http'));
  const workflowApi = useService(WorkflowApi);
  const queryClient = useQueryClient();

  return useMutation<CreatedImport, ImportSetupError, ImportFormState>({
    mutationFn: (values) => createImport({ http, workflowApi, values }),
    onSuccess: () => queryClient.invalidateQueries(importKeys.all),
  });
};
