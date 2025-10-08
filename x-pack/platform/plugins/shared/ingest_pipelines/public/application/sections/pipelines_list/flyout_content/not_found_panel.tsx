/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiCallOut,
  EuiCode,
  EuiButton,
  useGeneratedHtmlId,
  EuiSpacer,
  EuiSplitPanel,
} from '@elastic/eui';
import { EuiTitle } from '@elastic/eui';
import type { Error } from '../../../../shared_imports';
import { getErrorText, isIntegrationsPipeline } from '../../utils';

interface Props {
  pipelineName: string;
  error: Error;
  displayWarning: boolean;
  onCreatePipeline: () => void;
}

export const NotFoundPanel: FunctionComponent<Props> = ({
  pipelineName,
  error,
  displayWarning,
  onCreatePipeline,
}) => {
  const renderErrorCallOut = () => {
    const isCustom = isIntegrationsPipeline(pipelineName);
    if (displayWarning || (error.statusCode === 404 && isCustom)) {
      return (
        <EuiCallOut
          announceOnMount
          title={
            isCustom ? (
              <FormattedMessage
                id="xpack.ingestPipelines.list.missingCustomPipeline.title"
                defaultMessage="Custom pipeline does not exist"
              />
            ) : (
              <FormattedMessage
                id="xpack.ingestPipelines.list.missingPipeline.title"
                defaultMessage="The pipeline {pipelineName} does not exist."
                values={{
                  pipelineName: <EuiCode>{pipelineName}</EuiCode>,
                }}
              />
            )
          }
          color="warning"
          iconType="warning"
          data-test-subj="missingCustomPipeline"
        >
          {isCustom && (
            <p data-test-subj="cause">
              <FormattedMessage
                id="xpack.ingestPipelines.list.missingCustomPipeline.text"
                defaultMessage="The pipeline {pipelineName} does not exist."
                values={{
                  pipelineName: <EuiCode>{pipelineName}</EuiCode>,
                }}
              />
            </p>
          )}
          <EuiButton
            color="warning"
            onClick={onCreatePipeline}
            data-test-subj="createCustomPipeline"
          >
            <FormattedMessage
              id="xpack.ingestPipelines.list.missingCustomPipeline.button"
              defaultMessage="Create pipeline"
            />
          </EuiButton>
        </EuiCallOut>
      );
    }
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.list.loadingError"
            defaultMessage="Error loading pipeline"
          />
        }
        color="danger"
        iconType="warning"
        data-test-subj="pipelineError"
      >
        <p data-test-subj="cause">{getErrorText(error)}</p>
      </EuiCallOut>
    );
  };
  const pipelineErrorTitleId = useGeneratedHtmlId();

  return (
    <EuiSplitPanel.Inner data-test-subj="pipelineErrorFlyout">
      {pipelineName && (
        <EuiTitle id="notFoundFlyoutTitle" data-test-subj="title">
          <h2 id={pipelineErrorTitleId}>{pipelineName}</h2>
        </EuiTitle>
      )}

      <EuiSpacer size="l" />

      {renderErrorCallOut()}
    </EuiSplitPanel.Inner>
  );
};
