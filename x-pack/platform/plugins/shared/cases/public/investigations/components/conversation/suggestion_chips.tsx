/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { useSendPrompt } from './use_send_prompt';
import { useSuggestionPrompts } from './use_suggestion_prompts';
import * as i18n from './translations';

/** The side panel shows the first two chips, in short form. */
const COMPACT_CHIP_COUNT = 2;

export interface SuggestionChipsProps {
  record: InvestigationRecord;
  /** The conversation (main or thread) the prompt is sent to. */
  conversationId: string;
  /** Called after the agent answered, so the embedded conversation can reload and show the round. */
  onSent: () => void;
  compact?: boolean;
}

/** Prompt chips above the chat. A click sends the prompt to the selected conversation. */
export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  record,
  conversationId,
  onSent,
  compact,
}) => {
  const prompts = useSuggestionPrompts(record);
  const { mutateAsync, isLoading, variables } = useSendPrompt(record);
  const shown = compact ? prompts.slice(0, COMPACT_CHIP_COUNT) : prompts;

  const send = (input: string) => {
    mutateAsync({ conversationId, input })
      .then(onSent)
      .catch(() => undefined);
  };

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      role="group"
      aria-label={i18n.SUGGESTIONS_LABEL}
      css={css`
        flex: 0 0 auto;
      `}
      data-test-subj="investigationSuggestionChips"
    >
      {shown.map(({ id, label, compactLabel, prompt }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiBadge
            color="hollow"
            iconType={ICONS.agent}
            isDisabled={isLoading}
            onClick={() => send(prompt)}
            onClickAriaLabel={prompt}
            title={prompt}
            data-test-subj={`investigationSuggestion-${id}`}
          >
            {compact ? compactLabel : label}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {isLoading ? (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            role="status"
            data-test-subj="investigationSuggestionSending"
            title={variables?.input}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {i18n.SUGGESTION_SENDING}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
SuggestionChips.displayName = 'SuggestionChips';
