/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionStep } from '@kbn/agent-builder-common';
import type { ReactNode } from 'react';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { ThinkingItemLayout } from './thinking_item_layout';

const labels = {
  compactionLabel: i18n.translate('xpack.agentBuilder.thinking.compaction.label', {
    defaultMessage: 'Context optimized',
  }),
};

interface CompactionDisplayProps {
  step: CompactionStep;
  icon?: ReactNode;
  textColor?: string;
  isInProgress?: boolean;
}

export const CompactionDisplay: React.FC<CompactionDisplayProps> = ({
  step,
  icon,
  textColor,
  isInProgress = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const compactionIcon = icon ?? (
    <EuiIcon type={isInProgress ? 'sortDown' : 'compress'} color="primary" />
  );

  if (isInProgress) {
    return (
      <ThinkingItemLayout icon={compactionIcon} textColor={textColor}>
        <div role="status" aria-live="polite">
          <EuiText size="s" color={textColor}>
            <FormattedMessage
              id="xpack.agentBuilder.thinking.compaction.inProgress"
              defaultMessage="Compacting conversation context"
            />
          </EuiText>
        </div>
      </ThinkingItemLayout>
    );
  }

  return (
    <ThinkingItemLayout icon={compactionIcon} textColor={textColor}>
      <div role="status" aria-live="polite">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          wrap
          css={css`
            color: ${textColor};
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiBadge
              color="hollow"
              css={css`
                border-color: ${euiTheme.colors.primary};
                color: ${euiTheme.colors.primary};
              `}
            >
              {labels.compactionLabel}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.agentBuilder.thinking.compaction.summarized"
                defaultMessage="Summarized {count} {count, plural, one {round} other {rounds}} ({before} → {after} tokens)"
                values={{
                  count: step.summarized_round_count,
                  before: step.token_count_before.toLocaleString(),
                  after: step.token_count_after.toLocaleString(),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </ThinkingItemLayout>
  );
};
