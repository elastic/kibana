/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type { Pattern } from '../../../../common/http_api/patterns';
import { PatternDetailFlyout } from './pattern_detail_flyout';
import { humanizePatternType, patternSummary, patternTarget } from './pattern_format';

const statusColor = (status: Pattern['status']): 'success' | 'warning' | 'default' =>
  status === 'resolved' ? 'success' : status === 'improving' ? 'warning' : 'default';

const round = (value?: number, digits = 2): string | undefined =>
  typeof value === 'number' ? value.toFixed(digits).replace(/\.?0+$/, '') : undefined;

interface PatternRowProps {
  aiIndexId: string;
  aiIndex: GetAiIndexResponse | undefined;
  pattern: Pattern;
}

/**
 * A single failure pattern rendered as a compact "issue" summary: its formal
 * title (type + target index), a one-line description of what was detected, and
 * a primary action that opens the detail flyout (evidence + cases + waterfall).
 */
export const PatternRow = ({ aiIndexId, aiIndex, pattern }: PatternRowProps) => {
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const target = patternTarget(pattern);
  const caseCount = pattern.evidence?.case_count ?? 0;
  const ev = pattern.evidence ?? {};
  const parts = pattern.partitions ?? {};

  // Compact evidence chips shown under the title.
  const evidenceChips = [
    ev.frequency != null ? `${round(ev.frequency)}/round` : undefined,
    ev.confidence != null
      ? i18n.translate('xpack.contextEngine.aiIndexDetail.patterns.confidenceChip', {
          defaultMessage: 'confidence {v}',
          values: { v: round(ev.confidence) },
        })
      : undefined,
    `dev ${parts.dev_count ?? 0} · eval ${parts.eval_count ?? 0} · regression ${
      parts.regression_count ?? 0
    }`,
  ].filter(Boolean) as string[];

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="contextPatternRow">
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{humanizePatternType(pattern.type)}</strong>
              </EuiText>
            </EuiFlexItem>
            {target && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {target}
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>

          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {patternSummary(pattern)}
            </p>
          </EuiText>

          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="xs" wrap responsive={false} alignItems="center">
            {evidenceChips.map((chip) => (
              <EuiFlexItem grow={false} key={chip}>
                <EuiBadge color="default">{chip}</EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s" alignItems="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">
                    {i18n.translate('xpack.contextEngine.aiIndexDetail.patterns.caseCount', {
                      defaultMessage: '{count, plural, one {# case} other {# cases}}',
                      values: { count: caseCount },
                    })}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color={statusColor(pattern.status)}>{pattern.status}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                iconType="inspect"
                onClick={() => setFlyoutOpen(true)}
                data-test-subj="contextViewPatternButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.patterns.viewDetails"
                  defaultMessage="View details"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      {flyoutOpen && (
        <PatternDetailFlyout
          aiIndexId={aiIndexId}
          aiIndex={aiIndex}
          pattern={pattern}
          onClose={() => setFlyoutOpen(false)}
        />
      )}
    </EuiPanel>
  );
};
