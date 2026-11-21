/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiDescriptionList, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { BinaryAgreement, OrdinalAgreement } from '@kbn/evals-common';
import { useEvaluatorReviewAgreement } from '../../hooks/use_review_queues_api';
import { formatMetric, formatMetricWithInterval, formatPercent } from './format';

const TITLE = i18n.translate('xpack.evals.judgeAgreement.title', {
  defaultMessage: 'Judge agreement with human reviewers',
});
const EMPTY = i18n.translate('xpack.evals.judgeAgreement.empty', {
  defaultMessage: 'No pass/fail labels yet. Agreement appears after the first reviewed item.',
});
const SAMPLE_SIZE = i18n.translate('xpack.evals.judgeAgreement.sampleSize', {
  defaultMessage: 'Reviewed items compared',
});
const RAW_AGREEMENT = i18n.translate('xpack.evals.judgeAgreement.rawAgreement', {
  defaultMessage: 'Raw agreement',
});
const KAPPA = i18n.translate('xpack.evals.judgeAgreement.kappa', {
  defaultMessage: "Cohen's κ (95% CI)",
});
const PRECISION = i18n.translate('xpack.evals.judgeAgreement.precision', {
  defaultMessage: 'Judge precision (95% CI)',
});
const RECALL = i18n.translate('xpack.evals.judgeAgreement.recall', {
  defaultMessage: 'Judge recall (95% CI)',
});
const WEIGHTED_KAPPA = i18n.translate('xpack.evals.judgeAgreement.weightedKappa', {
  defaultMessage: 'Weighted κ on numeric scores',
});

interface JudgeAgreementPanelProps {
  binary: BinaryAgreement | null;
  ordinal: OrdinalAgreement | null;
}

export const JudgeAgreementPanel: React.FC<JudgeAgreementPanelProps> = ({ binary, ordinal }) => (
  <EuiPanel hasBorder hasShadow={false} paddingSize="m" data-test-subj="evalsJudgeAgreement">
    <EuiTitle size="xxs">
      <h3>{TITLE}</h3>
    </EuiTitle>
    {(binary === null || binary.n === 0) && !(ordinal && ordinal.n > 0) ? (
      <EuiText size="s" color="subdued">
        <p data-test-subj="evalsJudgeAgreementEmpty">{EMPTY}</p>
      </EuiText>
    ) : (
      <EuiDescriptionList
        compressed
        type="column"
        listItems={[
          ...(binary && binary.n > 0
            ? [
                { title: SAMPLE_SIZE, description: binary.n },
                { title: RAW_AGREEMENT, description: formatPercent(binary.rawAgreement) },
                {
                  title: KAPPA,
                  description: formatMetricWithInterval(binary.kappa, binary.kappaInterval),
                },
                {
                  title: PRECISION,
                  description: formatMetricWithInterval(binary.precision, binary.precisionInterval),
                },
                {
                  title: RECALL,
                  description: formatMetricWithInterval(binary.recall, binary.recallInterval),
                },
              ]
            : []),
          ...(ordinal && ordinal.n > 0
            ? [{ title: WEIGHTED_KAPPA, description: formatMetric(ordinal.weightedKappa) }]
            : []),
        ]}
      />
    )}
  </EuiPanel>
);

const BADGE_TEXT = (kappa: string, n: number, majorLabel: string) =>
  i18n.translate('xpack.evals.judgeAgreement.badge', {
    defaultMessage: 'judge agreement: κ={kappa}, n={n} ({majorLabel})',
    values: { kappa, n, majorLabel },
  });

const BADGE_TOOLTIP = i18n.translate('xpack.evals.judgeAgreement.badgeTooltip', {
  defaultMessage:
    'Pooled over every review queue of this evaluator on the same major version. A major version bump starts a new tally.',
});

const TRUNCATED_NOTE = i18n.translate('xpack.evals.judgeAgreement.truncatedNote', {
  defaultMessage:
    'Only the most recent review queues were scanned, so older queues are not included in this tally.',
});

const majorOf = (version: string): string | undefined => /^v?(\d+)(?:\.|$)/.exec(version)?.[1];

/**
 * Agreement of one evaluator version line with its human reviewers. Renders nothing until a
 * reviewer has labelled an item, so an evaluator no one has reviewed shows no claim.
 */
export const EvaluatorAgreementBadge: React.FC<{ evaluatorName: string; version: string }> = ({
  evaluatorName,
  version,
}) => {
  const { data } = useEvaluatorReviewAgreement(evaluatorName, version);
  if (!data?.binary || data.binary.n === 0) {
    return null;
  }
  const major = majorOf(version);
  const text = BADGE_TEXT(
    formatMetricWithInterval(data.binary.kappa, data.binary.kappaInterval),
    data.binary.n,
    major === undefined ? version : `v${major}.x`
  );
  return (
    <EuiBadge
      color="hollow"
      title={data.truncated ? `${BADGE_TOOLTIP} ${TRUNCATED_NOTE}` : BADGE_TOOLTIP}
      data-test-subj="evalsEvaluatorAgreementBadge"
    >
      {text}
    </EuiBadge>
  );
};
