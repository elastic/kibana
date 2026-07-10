/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { RunExperimentRequest } from '../../../common/experiments/run_experiment';
import { useSaveExperimentWorkflow } from '../../hooks/use_experiments_api';

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
          toasts?.addSuccess(
            i18n.translate('xpack.evals.saveAsWorkflowButton.success', {
              defaultMessage: 'Saved workflow "{name}".',
              values: { name: result.name },
            })
          );
        },
        onError: (error) => {
          toasts?.addError(error as Error, {
            title: i18n.translate('xpack.evals.saveAsWorkflowButton.error', {
              defaultMessage: 'Failed to save workflow',
            }),
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
        {i18n.translate('xpack.evals.saveAsWorkflowButton.openSaved', {
          defaultMessage: 'Open saved workflow',
        })}
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
      {i18n.translate('xpack.evals.saveAsWorkflowButton.label', {
        defaultMessage: 'Save as workflow',
      })}
    </EuiButton>
  );
};
