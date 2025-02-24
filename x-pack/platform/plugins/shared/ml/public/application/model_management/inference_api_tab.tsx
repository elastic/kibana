/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import {
  EuiAccordion,
  EuiCodeBlock,
  EuiFlexGrid,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

export interface InferenceAPITabProps {
  inferenceApis: InferenceInferenceEndpointInfo[];
}

export const InferenceApi: FC<InferenceAPITabProps> = ({ inferenceApis }) => {
  return (
    <>
      {inferenceApis.map((inferenceApi, i) => {
        const initialIsOpen = i <= 2;

        const modelId = inferenceApi.inference_id;

        return (
          <React.Fragment key={modelId}>
            <EuiAccordion
              id={modelId}
              buttonContent={
                <EuiTitle size="xs">
                  <h5>{modelId}</h5>
                </EuiTitle>
              }
              paddingSize="l"
              initialIsOpen={initialIsOpen}
            >
              <EuiFlexGrid columns={2}>
                <EuiFlexItem data-test-subj={`mlTrainedModelPipelineDefinition_${modelId}`}>
                  <EuiPanel>
                    <EuiTitle size={'xxs'}>
                      <h6>
                        <FormattedMessage
                          id="xpack.ml.trainedModels.modelsList.expandedRow.inferenceApiDefinitionTitle"
                          defaultMessage="Definition"
                        />
                      </h6>
                    </EuiTitle>
                    <EuiCodeBlock
                      language="json"
                      fontSize="m"
                      paddingSize="m"
                      overflowHeight={300}
                      isCopyable
                    >
                      {JSON.stringify(inferenceApi, null, 2)}
                    </EuiCodeBlock>
                  </EuiPanel>
                </EuiFlexItem>
              </EuiFlexGrid>
            </EuiAccordion>
          </React.Fragment>
        );
      })}
    </>
  );
};
