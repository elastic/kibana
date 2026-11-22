/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { MAX_REVIEW_RATIONALE_LENGTH } from '@kbn/evals-common';
import type { SubmitReviewVerdictVariables } from '../../hooks/use_review_queues_api';
import * as i18n from './translations';

type Verdict = SubmitReviewVerdictVariables['verdict'];

interface VerdictFormProps {
  isSubmitting: boolean;
  onSubmit: (verdict: Verdict) => void;
}

/** Rendered with `key={item.id}` by the caller so every item starts from an empty form. */
export const VerdictForm: React.FC<VerdictFormProps> = ({ isSubmitting, onSubmit }) => {
  const [label, setLabel] = useState<'pass' | 'fail' | undefined>();
  const [score, setScore] = useState('');
  const [rationale, setRationale] = useState('');

  const parsedScore = score.trim() === '' ? undefined : Number(score);
  const hasValidScore = parsedScore === undefined || Number.isFinite(parsedScore);
  const canSubmit = (label !== undefined || parsedScore !== undefined) && hasValidScore;

  const submit = () => {
    onSubmit({
      ...(label ? { label } : {}),
      ...(parsedScore !== undefined ? { value: parsedScore } : {}),
      ...(rationale.trim() ? { rationale: rationale.trim() } : {}),
    });
  };

  return (
    <div data-test-subj="evalsReviewVerdictForm">
      <EuiFormRow label={i18n.VERDICT_LEGEND}>
        <EuiButtonGroup
          legend={i18n.VERDICT_LEGEND}
          buttonSize="m"
          options={[
            { id: 'pass', label: i18n.PASS, 'data-test-subj': 'evalsReviewPass' },
            { id: 'fail', label: i18n.FAIL, 'data-test-subj': 'evalsReviewFail' },
          ]}
          idSelected={label ?? ''}
          onChange={(id) => setLabel(id === 'pass' ? 'pass' : 'fail')}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.SCORE_LABEL} isInvalid={!hasValidScore}>
        <EuiFieldNumber
          isInvalid={!hasValidScore}
          value={score}
          step="any"
          onChange={(e) => setScore(e.target.value)}
          data-test-subj="evalsReviewScore"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.RATIONALE_LABEL} fullWidth>
        <EuiTextArea
          fullWidth
          value={rationale}
          maxLength={MAX_REVIEW_RATIONALE_LENGTH}
          onChange={(e) => setRationale(e.target.value)}
          data-test-subj="evalsReviewRationale"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            isDisabled={!canSubmit}
            isLoading={isSubmitting}
            onClick={submit}
            data-test-subj="evalsReviewSubmit"
          >
            {i18n.SUBMIT}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            isDisabled={isSubmitting}
            onClick={() => onSubmit({ skip: true })}
            data-test-subj="evalsReviewSkip"
          >
            {i18n.SKIP}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
