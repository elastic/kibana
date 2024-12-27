/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { InferenceForm } from './inference_form';

interface AddInferenceFlyoutWrapperProps {
  onFlyoutClose: () => void;
  resendRequest: () => void;
}

export const AddInferenceFlyoutWrapper: React.FC<AddInferenceFlyoutWrapperProps> = ({
  onFlyoutClose,
  resendRequest,
}) => {
  const inferenceCreationFlyoutId = useGeneratedHtmlId({
    prefix: 'addInferenceFlyoutId',
  });

  return (
    <EuiFlyout
      ownFocus
      onClose={onFlyoutClose}
      aria-labelledby={inferenceCreationFlyoutId}
      data-test-subj="create-inference-flyout"
    >
      <EuiFlyoutHeader hasBorder data-test-subj="create-inference-flyout-header">
        <EuiTitle size="m">
          <h2 id={inferenceCreationFlyoutId}>
            {i18n.translate(
              'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.createInferenceFlyoutHeader',
              {
                defaultMessage: 'Create Inference Endpoint',
              }
            )}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <InferenceForm onSubmitSuccess={onFlyoutClose} resendRequest={resendRequest} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="create-inference-flyout-close-button"
              onClick={onFlyoutClose}
              flush="left"
            >
              {i18n.translate(
                'xpack.idxMgmt.mappingsEditor.parameters.inferenceId.popover.createInferenceFlyoutCancelButton',
                {
                  defaultMessage: 'Cancel',
                }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
