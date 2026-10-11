/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTelemetryId } from '../context';

interface PromptModalProps {
  prompt: string;
  onClose: () => void;
}

export const PromptModal = ({ prompt, onClose }: PromptModalProps) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'elasticsearchHomePromptModal' });
  const getTelemetryId = useTelemetryId();
  const { euiTheme } = useEuiTheme();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={modalTitleId}
      maxWidth={euiTheme.base * 37.5}
      data-test-subj="elasticsearchHomePromptModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.elasticsearchHome.home.chat.promptModal.title', {
            defaultMessage: 'Prompt your coding agent',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.elasticsearchHome.home.chat.promptModal.description', {
              defaultMessage: 'Paste this prompt into any coding agent to install Elastic skills.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiCodeBlock
          language="text"
          isCopyable
          paddingSize="m"
          data-test-subj="elasticsearchHomePromptModalCode"
        >
          {prompt}
        </EuiCodeBlock>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          data-test-subj="elasticsearchHomePromptModalCloseButton"
          data-telemetry-id={getTelemetryId('chat-closePrompt')}
        >
          {i18n.translate('xpack.elasticsearchHome.home.chat.promptModal.close', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
        <EuiCopy textToCopy={prompt}>
          {(copy) => (
            <EuiButton
              fill
              iconType="copy"
              onClick={copy}
              data-test-subj="elasticsearchHomePromptModalCopyButton"
              data-telemetry-id={getTelemetryId('chat-copyPrompt')}
            >
              {i18n.translate('xpack.elasticsearchHome.home.chat.promptModal.copy', {
                defaultMessage: 'Copy to clipboard',
              })}
            </EuiButton>
          )}
        </EuiCopy>
      </EuiModalFooter>
    </EuiModal>
  );
};
