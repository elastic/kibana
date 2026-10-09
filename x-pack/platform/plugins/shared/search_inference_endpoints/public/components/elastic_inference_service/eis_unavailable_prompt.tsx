/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../hooks/use_kibana';

interface EisUnavailablePromptProps {
  error: Error | null;
  isRetrying: boolean;
  onRetry: () => void;
}

export const EisUnavailablePrompt = ({ error, isRetrying, onRetry }: EisUnavailablePromptProps) => {
  const {
    services: { notifications },
  } = useKibana();

  return (
    <EuiEmptyPrompt
      iconType="error"
      color="danger"
      data-test-subj="eisUnavailablePrompt"
      title={
        <h2>
          {i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.unavailable.title', {
            defaultMessage: 'Elastic Inference Service unavailable',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.searchInferenceEndpoints.eisModelsPage.unavailable.description', {
            defaultMessage:
              "We couldn't connect to Elastic Inference Service, so its models and endpoints are unavailable.",
          })}
        </p>
      }
      actions={[
        <EuiButton
          color="danger"
          fill
          iconType="refresh"
          isLoading={isRetrying}
          onClick={onRetry}
          data-test-subj="eisUnavailableRetryButton"
        >
          {i18n.translate(
            'xpack.searchInferenceEndpoints.eisModelsPage.unavailable.retryButtonLabel',
            { defaultMessage: 'Retry' }
          )}
        </EuiButton>,
        ...(error
          ? [
              <EuiButtonEmpty
                color="danger"
                onClick={() =>
                  notifications.showErrorDialog({
                    title: i18n.translate(
                      'xpack.searchInferenceEndpoints.eisModelsPage.unavailable.errorDialogTitle',
                      { defaultMessage: 'Elastic Inference Service unavailable' }
                    ),
                    error,
                  })
                }
                data-test-subj="eisUnavailableErrorDetailsButton"
              >
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.eisModelsPage.unavailable.errorDetailsButtonLabel',
                  { defaultMessage: 'View error details' }
                )}
              </EuiButtonEmpty>,
            ]
          : []),
      ]}
    />
  );
};
