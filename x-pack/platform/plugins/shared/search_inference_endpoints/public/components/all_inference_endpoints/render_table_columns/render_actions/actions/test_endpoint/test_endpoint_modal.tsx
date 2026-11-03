/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { TestEndpointResultView } from './test_endpoint_result';
import { useTestEndpoint } from '../../../../../../hooks/use_test_endpoint';
import type { TestTarget } from '../../../../../../utils/test_target';
import { getTestTargetName, getTestTargetVariables } from '../../../../../../utils/test_target';
import { getTestFailureTitle } from '../../../../../../utils/get_test_failure_title';

interface TestEndpointModalProps {
  target: TestTarget;
  taskType: string;
  onClose: () => void;
}

export const TestEndpointModal: React.FC<TestEndpointModalProps> = ({
  target,
  taskType,
  onClose,
}) => {
  const targetVariables = getTestTargetVariables(target);
  const targetName = getTestTargetName(target);
  const isRerank = taskType === 'rerank';
  const isEmbedding = taskType.endsWith('embedding');
  const modalTitleId = useGeneratedHtmlId();
  const [message, setMessage] = useState(() => {
    if (isRerank) {
      return 'what capital of canada?';
    }
    if (isEmbedding) {
      return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.defaultEmbeddingText', {
        defaultMessage: 'Hello Elastic',
      });
    }
    return i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.defaultMessage', {
      defaultMessage: 'Reply "Hello world"',
    });
  });
  const [documents, setDocuments] = useState(() => ['toronto', 'ottawa', 'calgary'].join('\n'));
  const [showRaw, setShowRaw] = useState(false);
  const { mutate: testEndpoint, data, error, isLoading } = useTestEndpoint();

  const documentList = documents
    .split('\n')
    .map((document) => document.trim())
    .filter(Boolean);
  const isMissingInput = message.trim() === '' || (isRerank && documentList.length === 0);

  const failure = data?.error;
  const requestFailureReason = error ? error.body?.message ?? error.message : undefined;

  return (
    <EuiModal onClose={onClose} aria-labelledby={modalTitleId} data-test-subj="testEndpointModal">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.title', {
            defaultMessage: 'Test {targetName}',
            values: { targetName },
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          fullWidth
          label={
            isRerank
              ? i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.queryLabel', {
                  defaultMessage: 'Query',
                })
              : i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.messageLabel', {
                  defaultMessage: 'Message',
                })
          }
        >
          <EuiTextArea
            fullWidth
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            data-test-subj="testEndpointMessageInput"
          />
        </EuiFormRow>
        {isRerank && (
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              label={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.documentsLabel', {
                defaultMessage: 'Input (one item per line)',
              })}
            >
              <EuiTextArea
                fullWidth
                rows={4}
                value={documents}
                onChange={(event) => setDocuments(event.target.value)}
                data-test-subj="testEndpointDocumentsInput"
              />
            </EuiFormRow>
          </>
        )}
        <EuiSpacer size="m" />
        {isLoading && (
          <EuiLoadingSpinner
            size="l"
            aria-label={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.loading', {
              defaultMessage: 'Testing endpoint',
            })}
            data-test-subj="testEndpointLoading"
          />
        )}
        {data?.ok && (
          <>
            {data.result && <TestEndpointResultView result={data.result} />}
            <EuiSpacer size="s" />
            <EuiText size="xs" color="subdued" data-test-subj="testEndpointLatency">
              {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.latency', {
                defaultMessage: 'Responded in {latencyMs} ms.',
                values: { latencyMs: data.latencyMs },
              })}
            </EuiText>
            <EuiSpacer size="s" />
            <EuiSwitch
              compressed
              label={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.showRaw', {
                defaultMessage: 'Show raw response',
              })}
              checked={showRaw}
              onChange={(event) => setShowRaw(event.target.checked)}
              data-test-subj="testEndpointRawToggle"
            />
            {showRaw && (
              <>
                <EuiSpacer size="s" />
                <EuiCodeBlock
                  language="json"
                  paddingSize="m"
                  overflowHeight={300}
                  isCopyable
                  data-test-subj="testEndpointRawResponse"
                >
                  {JSON.stringify(data.raw, null, 2)}
                </EuiCodeBlock>
              </>
            )}
          </>
        )}
        {failure && (
          <KbnDangerCallout
            announceOnMount
            data-test-subj="testEndpointFailure"
            title={getTestFailureTitle(failure.cause)}
            text={failure.reason}
          />
        )}
        {requestFailureReason && (
          <KbnDangerCallout
            announceOnMount
            data-test-subj="testEndpointRequestFailure"
            title={i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.requestFailure', {
              defaultMessage: 'The test could not be run.',
            })}
            text={requestFailureReason}
          />
        )}
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="testEndpointCloseButton">
          {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          isDisabled={isMissingInput}
          onClick={() =>
            testEndpoint({
              ...targetVariables,
              message,
              ...(isRerank && { documents: documentList }),
            })
          }
          data-test-subj="testEndpointRunButton"
        >
          {i18n.translate('xpack.searchInferenceEndpoints.testEndpoint.run', {
            defaultMessage: 'Test',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
