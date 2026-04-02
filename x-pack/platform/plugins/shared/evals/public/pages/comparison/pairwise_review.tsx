/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonGroup,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { EvaluatorScoreBadge } from '../../components/evaluator_score_badge';
import * as i18n from './translations';

type Vote = 'a' | 'b' | 'tie';

interface VariantScore {
  evaluator: string;
  score: number;
}

interface PairwiseReviewProps {
  variantAContent: string;
  variantBContent: string;
  variantAScores: VariantScore[];
  variantBScores: VariantScore[];
  onSubmit: (vote: Vote, notes: string) => void;
  isSubmitting?: boolean;
}

const VOTE_OPTIONS = [
  { id: 'a' as const, label: i18n.VOTE_A_BETTER },
  { id: 'b' as const, label: i18n.VOTE_B_BETTER },
  { id: 'tie' as const, label: i18n.VOTE_TIE },
];

export const PairwiseReview: React.FC<PairwiseReviewProps> = ({
  variantAContent,
  variantBContent,
  variantAScores,
  variantBScores,
  onSubmit,
  isSubmitting = false,
}) => {
  const [selectedVote, setSelectedVote] = useState<Vote | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    if (selectedVote) {
      onSubmit(selectedVote, notes);
    }
  };

  const renderScores = (scores: VariantScore[]) => (
    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
      {scores.map((s) => (
        <EuiFlexItem key={s.evaluator} grow={false}>
          <EuiText size="xs">
            <strong>{s.evaluator}:</strong>
          </EuiText>
          <EvaluatorScoreBadge score={s.score} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiTitle size="xs">
        <h4>{i18n.PAIRWISE_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="m" />

      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} color="subdued">
            <EuiTitle size="xxs">
              <h5>{i18n.VARIANT_A_LABEL}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock overflowHeight={300} fontSize="s" paddingSize="s">
              {variantAContent}
            </EuiCodeBlock>
            <EuiSpacer size="s" />
            {renderScores(variantAScores)}
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiPanel hasShadow={false} color="subdued">
            <EuiTitle size="xxs">
              <h5>{i18n.VARIANT_B_LABEL}</h5>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiCodeBlock overflowHeight={300} fontSize="s" paddingSize="s">
              {variantBContent}
            </EuiCodeBlock>
            <EuiSpacer size="s" />
            {renderScores(variantBScores)}
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <EuiFlexGroup alignItems="center" justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Vote selection"
            options={VOTE_OPTIONS}
            idSelected={selectedVote ?? ''}
            onChange={(id) => setSelectedVote(id as Vote)}
            buttonSize="m"
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFormRow label={i18n.NOTES_LABEL} fullWidth>
        <EuiTextArea fullWidth rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={handleSubmit}
            fill
            isLoading={isSubmitting}
            disabled={!selectedVote || isSubmitting}
          >
            {i18n.SUBMIT_REVIEW_BUTTON}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
