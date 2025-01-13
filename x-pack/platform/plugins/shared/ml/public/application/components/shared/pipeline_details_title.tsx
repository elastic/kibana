/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCode, EuiLink, EuiSpacer, EuiTitle, EuiText } from '@elastic/eui';

import { useMlKibana } from '../../contexts/kibana';

interface Props {
  modelId: string;
}

export const PipelineDetailsTitle: FC<Props> = ({ modelId }) => {
  const {
    services: {
      docLinks: { links },
    },
  } = useMlKibana();

  return (
    <>
      <EuiTitle size="s">
        <h4>
          {i18n.translate(
            'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.title',
            { defaultMessage: 'Create a pipeline' }
          )}
        </h4>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <p>
          <FormattedMessage
            id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.description"
            defaultMessage="Build a {pipeline} to use the trained model - {modelId} - for inference."
            values={{
              modelId: <EuiCode>{modelId}</EuiCode>,
              pipeline: (
                <EuiLink external target="_blank" href={links.ingest.pipelines}>
                  pipeline
                </EuiLink>
              ),
            }}
          />
        </p>
        <p>
          <FormattedMessage
            id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.configure.descriptionUsePipelines"
            defaultMessage="Use {pipelineSimulateLink} or {reindexLink} to pass data into this pipeline. Predictions are stored in the Target field."
            values={{
              reindexLink: (
                <EuiLink external target="_blank" href={links.upgradeAssistant.reindexWithPipeline}>
                  _reindex API
                </EuiLink>
              ),
              pipelineSimulateLink: (
                <EuiLink external target="_blank" href={links.apis.simulatePipeline}>
                  pipeline/_simulate
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </>
  );
};
