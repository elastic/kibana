/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { InvestigationHypothesis } from '@kbn/significant-events-schema';

const STATUS_ICON: Record<InvestigationHypothesis['status'], string> = {
  investigating: 'clock',
  dismissed: 'cross',
  confirmed: 'check',
};

const STATUS_COLOR: Record<InvestigationHypothesis['status'], string> = {
  investigating: 'hollow',
  dismissed: 'default',
  confirmed: 'success',
};

/**
 * At-a-glance scoreboard of every hypothesis: one compact chip per candidate with its status
 * icon and confidence. The reasoning behind each verdict lives in the investigation trail —
 * this row only answers "where does each candidate stand" without expanding anything.
 */
export const HypothesesSummary: React.FC<{ hypotheses: InvestigationHypothesis[] }> = ({
  hypotheses,
}) => {
  if (hypotheses.length === 0) return null;

  return (
    <EuiFlexGroup
      gutterSize="xs"
      wrap
      responsive={false}
      data-test-subj="investigationHypothesesSummary"
    >
      {hypotheses.map((hypothesis) => (
        <EuiFlexItem grow={false} key={hypothesis.candidate}>
          <EuiToolTip
            content={
              hypothesis.reason
                ? `${hypothesis.candidate} — ${hypothesis.reason}`
                : hypothesis.candidate
            }
          >
            <EuiBadge
              color={STATUS_COLOR[hypothesis.status]}
              iconType={STATUS_ICON[hypothesis.status]}
              css={css`
                max-width: 280px;
              `}
              data-test-subj={`investigationHypothesisChip-${hypothesis.status}`}
            >
              {hypothesis.candidate} · {Math.round(hypothesis.confidence * 100)}%
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
