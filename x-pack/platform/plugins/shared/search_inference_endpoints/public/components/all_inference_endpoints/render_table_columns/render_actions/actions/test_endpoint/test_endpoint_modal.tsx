/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { TestEndpointIdField } from './test_endpoint_id_field';
import { TestEndpointResult } from './test_endpoint_result';
import { TestEndpointStatus } from './test_endpoint_status';
import { useTestEndpoint } from '../../../../../../hooks/use_test_endpoint';

const modalStyles = ({ euiTheme }: UseEuiTheme) => css`
  width: ${euiTheme.base * 40}px;
`;

interface TestEndpointModalProps {
  inferenceId: string;
  onClose: () => void;
}

export const TestEndpointModal: React.FC<TestEndpointModalProps> = ({ inferenceId, onClose }) => {
  const modalTitleId = useGeneratedHtmlId();
  const { mutate: testEndpoint, data, error, isLoading } = useTestEndpoint();

  const requestFailureReason = error ? error.body?.message ?? error.message : undefined;

  return (
    <EuiModal
      onClose={onClose}
      css={modalStyles}
      aria-labelledby={modalTitleId}
      data-test-subj="testEndpointModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.title', {
            defaultMessage: 'Test endpoint',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <TestEndpointIdField inferenceId={inferenceId} />
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="play"
              isDisabled={isLoading}
              onClick={() => testEndpoint(inferenceId)}
              data-test-subj="testEndpointRunButton"
            >
              {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.run', {
                defaultMessage: 'Test',
              })}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false} aria-live="polite">
            <TestEndpointStatus isLoading={isLoading} response={data} />
          </EuiFlexItem>
        </EuiFlexGroup>
        {data && (
          <>
            <EuiSpacer size="m" />
            <TestEndpointResult response={data} />
          </>
        )}
        {requestFailureReason && (
          <>
            <EuiSpacer size="m" />
            <KbnDangerCallout
              announceOnMount
              data-test-subj="testEndpointRequestFailure"
              title={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.requestFailure', {
                defaultMessage: 'The test could not run.',
              })}
              text={requestFailureReason}
            />
          </>
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="testEndpointCloseButton">
          {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiModalFooter>
    </EuiModal>
  );
};
