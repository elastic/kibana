/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiBadgeProps } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiMarkdownFormat,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type {
  Hypothesis,
  HypothesisStatus,
  InvestigationHypotheses,
} from '../../../common/hypotheses/hypotheses';
import { EvidenceView } from '../../evidence/evidence_view';
import type {
  InvestigationAttachmentContentProps,
  InvestigationAttachmentVariant,
} from '../../investigation_attachments';

const NO_HYPOTHESES = i18n.translate('xpack.agenticInvestigations.hypotheses.attachments.empty', {
  defaultMessage: 'No hypotheses recorded yet.',
});

const HYPOTHESIS_STATUS_LABELS: Record<HypothesisStatus, string> = {
  investigating: i18n.translate('xpack.agenticInvestigations.hypotheses.status.investigating', {
    defaultMessage: 'Investigating',
  }),
  dismissed: i18n.translate('xpack.agenticInvestigations.hypotheses.status.dismissed', {
    defaultMessage: 'Dismissed',
  }),
  confirmed: i18n.translate('xpack.agenticInvestigations.hypotheses.status.confirmed', {
    defaultMessage: 'Confirmed',
  }),
};

const confidenceLabel = (confidence: number): string =>
  i18n.translate('xpack.agenticInvestigations.hypotheses.confidence', {
    defaultMessage: '{confidence}% confidence',
    values: { confidence: Math.round(confidence * 100) },
  });

const STATUS_COLORS: Record<HypothesisStatus, EuiBadgeProps['color']> = {
  investigating: 'primary',
  dismissed: 'default',
  confirmed: 'success',
};

const HypothesisItem = ({
  hypothesis: { candidate, confidence, status, reason, evidence = [] },
  variant,
}: {
  hypothesis: Hypothesis;
  variant: InvestigationAttachmentVariant;
}) => (
  <EuiFlexGroup direction="column" gutterSize="xs" data-test-subj="investigationHypothesis">
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiBadge color={STATUS_COLORS[status]} data-test-subj="investigationHypothesisStatus">
            {HYPOTHESIS_STATUS_LABELS[status]}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued" data-test-subj="investigationHypothesisConfidence">
            {confidenceLabel(confidence)}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h4>{candidate}</h4>
      </EuiTitle>
    </EuiFlexItem>
    {reason?.trim() && (
      <EuiFlexItem grow={false} data-test-subj="investigationHypothesisReason">
        <EuiMarkdownFormat textSize="s">{reason}</EuiMarkdownFormat>
      </EuiFlexItem>
    )}
    {variant === 'details' &&
      evidence.map((item, index) => (
        <EuiFlexItem grow={false} key={index}>
          <EvidenceView evidence={item} />
        </EuiFlexItem>
      ))}
  </EuiFlexGroup>
);

/**
 * The hypotheses an investigation considered, in the order the agent reported them, each with
 * its status, confidence, and reason. The details flyout also shows each hypothesis's evidence;
 * the inline chat render leaves it out to stay compact.
 */
export const HypothesesView: React.FC<
  InvestigationAttachmentContentProps<InvestigationHypotheses>
> = ({ document: { hypotheses }, variant }) => {
  if (hypotheses.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationHypothesesEmpty">
        {NO_HYPOTHESES}
      </EuiText>
    );
  }
  return (
    <EuiFlexGroup direction="column" gutterSize="m" data-test-subj="investigationHypotheses">
      {hypotheses.map((hypothesis, index) => (
        <EuiFlexItem grow={false} key={index}>
          <HypothesisItem hypothesis={hypothesis} variant={variant} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
