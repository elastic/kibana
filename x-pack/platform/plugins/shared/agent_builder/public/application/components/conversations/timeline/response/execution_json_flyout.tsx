/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCodeBlock, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { ConversationRoundStep, ExecutionTerminatedEvent } from '@kbn/agent-builder-common';

const title = i18n.translate('xpack.agentBuilder.response.jsonFlyout.title', {
  defaultMessage: 'Raw response',
});

interface ExecutionJsonFlyoutProps {
  executionTerminatedEvent: ExecutionTerminatedEvent;
  /** The execution's steps, which the saved event omits because they are stored as separate events. */
  steps?: ConversationRoundStep[];
  onClose: () => void;
}

export const ExecutionJsonFlyout: React.FC<ExecutionJsonFlyoutProps> = ({
  executionTerminatedEvent,
  steps,
  onClose,
}) => {
  const formattedJson = useMemo(() => {
    const { data } = executionTerminatedEvent;
    return JSON.stringify(
      { ...executionTerminatedEvent, data: { ...data, steps: data.steps ?? steps } },
      null,
      2
    );
  }, [executionTerminatedEvent, steps]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby="agentBuilderExecutionJsonFlyoutTitle"
      size="m"
      ownFocus={false}
      css={css`
        z-index: ${euiThemeVars.euiZFlyout + 4};
      `}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="agentBuilderExecutionJsonFlyoutTitle">{title}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiCodeBlock
          language="json"
          fontSize="s"
          paddingSize="m"
          isCopyable
          css={css`
            overflow: auto;
          `}
        >
          {formattedJson}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
