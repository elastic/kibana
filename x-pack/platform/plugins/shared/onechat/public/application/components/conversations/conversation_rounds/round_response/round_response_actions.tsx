/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText, EuiI18nNumber } from '@elastic/eui';
import { css } from '@emotion/react';
import copy from 'copy-to-clipboard';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { RoundModelUsageStats } from '@kbn/onechat-common';
import { useToasts } from '../../../../hooks/use_toasts';

const labels = {
  copy: i18n.translate('xpack.onechat.roundResponseActions.copy', {
    defaultMessage: 'Copy response',
  }),
  copySuccess: i18n.translate('xpack.onechat.roundResponseActions.copySuccess', {
    defaultMessage: 'Response copied to clipboard',
  }),
};

interface RoundResponseActionsProps {
  content: string;
  modelUsage: RoundModelUsageStats;
  isVisible: boolean;
}

export const RoundResponseActions: React.FC<RoundResponseActionsProps> = ({
  content,
  modelUsage,
  isVisible,
}) => {
  const { addSuccessToast } = useToasts();

  const handleCopy = useCallback(() => {
    const isSuccess = copy(content);
    if (isSuccess) {
      addSuccessToast(labels.copySuccess);
    }
  }, [content, addSuccessToast]);

  return (
    <EuiFlexGroup
      direction="row"
      justifyContent="spaceBetween"
      gutterSize="xs"
      responsive={false}
      css={css`
        opacity: ${isVisible ? 1 : 0};
        transition: opacity 0.2s ease;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiButtonIcon
          iconType="copyClipboard"
          aria-label={labels.copy}
          onClick={handleCopy}
          color="text"
          data-test-subj="roundResponseCopyButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <FormattedMessage
            id="xpack.onechat.roundResponseActions.tokenUsage"
            defaultMessage="Input tokens: {inputTokens} / Output tokens: {outputTokens}"
            values={{
              inputTokens: <EuiI18nNumber value={modelUsage.input_tokens} />,
              outputTokens: <EuiI18nNumber value={modelUsage.output_tokens} />,
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
