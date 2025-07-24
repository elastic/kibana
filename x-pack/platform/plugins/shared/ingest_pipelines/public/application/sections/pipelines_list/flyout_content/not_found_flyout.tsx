/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
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
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { Error, useKibana } from '../../../../shared_imports';
import { getCreatePath } from '../../../services/navigation';
import { getErrorText, isIntegrationsPipeline } from '../../utils';

interface Props {
  pipelineName: string;
  error: Error;
}

export const PipelineNotFoundFlyout: FunctionComponent<Props> = ({ pipelineName, error }) => {
  const { history } = useKibana().services;
  const renderErrorCallOut = () => {
    if (error.statusCode === 404 && isIntegrationsPipeline(pipelineName)) {
      return (
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.ingestPipelines.list.missingCustomPipeline.title"
              defaultMessage="Custom pipeline does not exist"
            />
          }
          color="warning"
          iconType="warning"
          data-test-subj="missingCustomPipeline"
        >
          <p data-test-subj="cause">
            <FormattedMessage
              id="xpack.ingestPipelines.list.missingCustomPipeline.text"
              defaultMessage="The pipeline {pipelineName} does not exist."
              values={{
                pipelineName: <EuiCode>{pipelineName}</EuiCode>,
              }}
            />
          </p>
          <EuiButton
            color="warning"
            {...reactRouterNavigate(
              history,
              getCreatePath({
                pipelineName,
              })
            )}
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
    <EuiSplitPanel.Inner>
      {pipelineName && (
        <EuiTitle id="notFoundFlyoutTitle" data-test-subj="title">
          <h2 id={pipelineErrorTitleId}>{pipelineName}</h2>
        </EuiTitle>
      )}

      <EuiSpacer size="s" />

      {renderErrorCallOut()}
    </EuiSplitPanel.Inner>
  );
};
