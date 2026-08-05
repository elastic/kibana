/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useWorkflowsApi } from '@kbn/workflows-ui';
import { useCallback, useState } from 'react';
import { getErrorMessage } from '../utils/get_error_message';
import { useKibana } from './use_kibana';

/** Creates a workflow from a YAML definition and returns its id, or `undefined` on failure. */
export const useCreateWorkflow = () => {
  const api = useWorkflowsApi();
  const {
    services: { notifications },
  } = useKibana();
  const [isCreating, setIsCreating] = useState(false);

  const createWorkflow = useCallback(
    async (yaml: string): Promise<string | undefined> => {
      setIsCreating(true);
      try {
        const workflow = await api.createWorkflow({ yaml });
        return workflow.id;
      } catch (error) {
        const toastMessage = getErrorMessage(error);
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.contextEngine.createWorkflow.errorTitle', {
            defaultMessage: 'Unable to create workflow',
          }),
          ...(toastMessage ? { toastMessage } : {}),
        });
        return undefined;
      } finally {
        setIsCreating(false);
      }
    },
    [api, notifications]
  );

  return { createWorkflow, isCreating };
};
