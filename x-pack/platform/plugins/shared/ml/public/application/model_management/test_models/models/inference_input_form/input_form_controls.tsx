/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import { EuiButton, EuiButtonEmpty, EuiFlexItem } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import type { InferrerType } from '..';

interface Props {
  testButtonDisabled: boolean;
  createPipelineButtonDisabled: boolean;
  inferrer: InferrerType;
  showCreatePipelineButton?: boolean;
}

export const InputFormControls: FC<Props> = ({
  testButtonDisabled,
  createPipelineButtonDisabled,
  inferrer,
  showCreatePipelineButton,
}) => {
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiButton
          disabled={testButtonDisabled}
          fullWidth={false}
          data-test-subj={'mlTestModelTestButton'}
          type={'submit'}
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.runButton"
            defaultMessage="Test"
          />
        </EuiButton>
      </EuiFlexItem>
      {showCreatePipelineButton ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            disabled={createPipelineButtonDisabled}
            data-test-subj={'mlTestModelCreatePipelineButton'}
            onClick={() => {
              if (inferrer.switchToCreationMode) {
                inferrer.switchToCreationMode();
              }
            }}
          >
            <FormattedMessage
              id="xpack.ml.trainedModels.testModelsFlyout.inferenceInputForm.createPipelineButton"
              defaultMessage="Create pipeline"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </>
  );
};
