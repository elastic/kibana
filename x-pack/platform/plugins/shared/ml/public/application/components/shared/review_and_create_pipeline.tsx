/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import {
  EuiAccordion,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  EuiText,
  EuiTextColor,
  htmlIdGenerator,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { IngestPipeline } from '@elastic/elasticsearch/lib/api/types';
import { useMlKibana } from '../../contexts/kibana';
import { ReindexWithPipeline } from '../ml_inference/components/reindex_with_pipeline';

const MANAGEMENT_APP_ID = 'management';

function getFieldFromPipelineConfig(config: estypes.IngestPipeline) {
  const { processors } = config;
  let field = '';
  if (processors?.length) {
    field = Object.keys(processors[0].inference?.field_map ?? {})[0];
  }
  return field;
}

interface Props {
  highlightTargetField?: boolean;
  inferencePipeline: IngestPipeline;
  modelType?: string;
  pipelineName: string;
  pipelineCreated: boolean;
  pipelineError?: string;
  sourceIndex?: string;
}

export const ReviewAndCreatePipeline: FC<Props> = ({
  highlightTargetField = false,
  inferencePipeline,
  modelType,
  pipelineName,
  pipelineCreated,
  pipelineError,
  sourceIndex,
}) => {
  const {
    services: {
      application,
      docLinks: { links },
    },
  } = useMlKibana();

  const [isNextStepsAccordionOpen, setIsNextStepsAccordionOpen] = useState<'open' | 'closed'>(
    'closed'
  );

  const inferenceProcessorLink =
    modelType === 'regression'
      ? links.ingest.inferenceRegression
      : links.ingest.inferenceClassification;

  const accordionId = useMemo(() => htmlIdGenerator()(), []);
  const targetedField = useMemo(
    () => getFieldFromPipelineConfig(inferencePipeline),
    [inferencePipeline]
  );

  const configCodeBlock = useMemo(
    () => (
      <EuiCodeBlock
        language="json"
        isCopyable
        overflowHeight="400px"
        data-test-subj="mlTrainedModelsInferenceReviewAndCreateStepConfigBlock"
      >
        {JSON.stringify(inferencePipeline ?? {}, null, 2)}
      </EuiCodeBlock>
    ),
    [inferencePipeline]
  );

  return (
    <>
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        data-test-subj="mlTrainedModelsInferenceReviewAndCreateStep"
      >
        <EuiFlexItem grow={2}>
          {pipelineCreated === false ? (
            <EuiTitle size="s">
              <h4>
                {i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.title',
                  {
                    defaultMessage: "Review the pipeline configuration for ''{pipelineName}''",
                    values: { pipelineName },
                  }
                )}
              </h4>
            </EuiTitle>
          ) : null}
          <>
            <EuiSpacer size="s" />
            {pipelineCreated === true && pipelineError === undefined ? (
              <EuiCallOut
                data-test-subj="mlTrainedModelsInferenceReviewAndCreateStepSuccessCallout"
                title={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.successMessage',
                  {
                    defaultMessage: "''{pipelineName}'' has been created successfully.",
                    values: { pipelineName },
                  }
                )}
                color="success"
                iconType="check"
              >
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.reIndexingMessage"
                    defaultMessage="You can use this pipeline to infer against new data or infer against existing data by {reindexLink} with the pipeline."
                    values={{
                      reindexLink: (
                        <EuiLink onClick={() => setIsNextStepsAccordionOpen('open')}>
                          {'reindexing'}
                        </EuiLink>
                      ),
                    }}
                  />
                  {application.capabilities.management?.ingest?.ingest_pipelines ? (
                    <FormattedMessage
                      id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.ingestPipelinesManagementMessage"
                      defaultMessage=" Navigate to {pipelineManagementLink} to view and manage pipelines."
                      values={{
                        pipelineManagementLink: (
                          <EuiLink
                            onClick={async () => {
                              await application.navigateToApp(MANAGEMENT_APP_ID, {
                                path: `/ingest/ingest_pipelines/?pipeline=${pipelineName}`,
                                openInNewTab: true,
                              });
                            }}
                            target="_blank"
                            external
                          >
                            {'Ingest Pipelines'}
                          </EuiLink>
                        ),
                      }}
                    />
                  ) : null}
                </p>
              </EuiCallOut>
            ) : null}
            {pipelineError !== undefined ? (
              <EuiCallOut
                title={i18n.translate(
                  'xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.failureMessage',
                  {
                    defaultMessage: "Unable to create ''{pipelineName}''.",
                    values: { pipelineName },
                  }
                )}
                color="danger"
                iconType="error"
              >
                <p>{pipelineError}</p>
                <p>
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.create.docLinkInErrorMessage"
                    defaultMessage="Learn more about {ingestPipelineConfigLink} and {inferencePipelineConfigLink} configuration."
                    values={{
                      ingestPipelineConfigLink: (
                        <EuiLink href={links.ingest.pipelines} external target={'_blank'}>
                          {'ingest pipeline'}
                        </EuiLink>
                      ),
                      inferencePipelineConfigLink: (
                        <EuiLink
                          href={modelType ? inferenceProcessorLink : links.ingest.inference}
                          external
                          target={'_blank'}
                        >
                          {'inference processor'}
                        </EuiLink>
                      ),
                    }}
                  />
                </p>
              </EuiCallOut>
            ) : null}
          </>
        </EuiFlexItem>
        {highlightTargetField ? (
          <EuiFlexItem grow={2}>
            <EuiText>
              <FormattedMessage
                id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.targetFieldDescription"
                defaultMessage="The field {field} will be targeted by the model for evaluation."
                values={{ field: <EuiTextColor color="accent">{targetedField}</EuiTextColor> }}
              />
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow>
          {pipelineCreated ? (
            <>
              <EuiSpacer size="m" />
              <EuiAccordion
                id={accordionId}
                buttonContent={
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.nextStepsLabel"
                    defaultMessage="Next steps"
                  />
                }
                forceState={isNextStepsAccordionOpen}
                onToggle={(isOpen) => {
                  setIsNextStepsAccordionOpen(isOpen ? 'open' : 'closed');
                }}
              >
                <ReindexWithPipeline pipelineName={pipelineName} sourceIndex={sourceIndex} />
              </EuiAccordion>
            </>
          ) : null}
        </EuiFlexItem>
        <EuiFlexItem grow>
          {pipelineCreated ? (
            <>
              <EuiSpacer size="m" />
              <EuiAccordion
                id={accordionId}
                buttonContent={
                  <FormattedMessage
                    id="xpack.ml.trainedModels.content.indices.pipelines.addInferencePipelineModal.steps.review.viewConfig"
                    defaultMessage="View configuration"
                  />
                }
              >
                {configCodeBlock}
              </EuiAccordion>
            </>
          ) : (
            [configCodeBlock]
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
