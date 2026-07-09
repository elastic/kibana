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
  const [isSaved, setIsSaved] = useState(false);

  const onSave = useCallback(() => {
    saveWorkflow.mutate(request, {
      onSuccess: (result) => {
        setIsSaved(true);
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
    });
  }, [request, saveWorkflow, toasts]);

  if (isSaved) {
    return (
      <EuiButton size={size} iconType="check" isDisabled data-test-subj="evalsSaveAsWorkflowSaved">
        {i18n.translate('xpack.evals.saveAsWorkflowButton.saved', {
          defaultMessage: 'Saved as workflow',
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
