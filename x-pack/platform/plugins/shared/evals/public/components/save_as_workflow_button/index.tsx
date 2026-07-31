/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RunExperimentRequest } from '../../../common/experiments/run_experiment';
import { useSaveExperimentWorkflow } from '../../hooks/use_experiments_api';
import { ERROR, LABEL, OPEN_SAVED, success } from './translations';

export interface SaveAsWorkflowButtonProps {
  request: RunExperimentRequest;
  size?: 's' | 'm';
}

export const SaveAsWorkflowButton: React.FC<SaveAsWorkflowButtonProps> = ({
  request,
  size = 's',
}) => {
  const { services } = useKibana();
  const toasts = services.notifications?.toasts;
  const saveWorkflow = useSaveExperimentWorkflow();
  const [savedWorkflowId, setSavedWorkflowId] = useState<string | undefined>(request.workflow_id);

  const onSave = useCallback(() => {
    saveWorkflow.mutate(
      { ...request, workflow_id: savedWorkflowId },
      {
        onSuccess: (result) => {
          setSavedWorkflowId(result.workflow_id);
          toasts?.addSuccess(success(result.name));
        },
        onError: (error) => {
          toasts?.addError(error as Error, {
            title: ERROR,
          });
        },
      }
    );
  }, [request, savedWorkflowId, saveWorkflow, toasts]);

  if (savedWorkflowId) {
    const href = services.http?.basePath.prepend(
      `/app/workflows/${encodeURIComponent(savedWorkflowId)}`
    );
    return (
      <EuiButton
        size={size}
        iconType="popout"
        href={href}
        target="_blank"
        data-test-subj="evalsSaveAsWorkflowSaved"
      >
        {OPEN_SAVED}
      </EuiButton>
    );
  }

  return (
    <EuiButton
      size={size}
      iconType="save"
      onClick={onSave}
      isLoading={saveWorkflow.isLoading}
      data-test-subj="evalsSaveAsWorkflowButton"
    >
      {LABEL}
    </EuiButton>
  );
};
