/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonGroup, EuiFieldNumber, EuiFormRow, EuiSpacer, EuiTextArea } from '@elastic/eui';
import type { ClaimItem, ClaimStatus, ItemPatch } from '../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../common/investigations/constants';
import { CLAIM_STATUSES, CLAIM_STATUS_LABELS } from './claim_utils';
import * as i18n from './translations';

export interface ClaimDraft {
  status: ClaimStatus;
  conclusion: string;
  note: string;
  reasoning: string;
  /** Kept as text so an empty box is distinct from zero. */
  confidence: string;
}

export interface ClaimDraftErrors {
  conclusion?: string;
  note?: string;
  confidence?: string;
}

export const draftFromClaim = (claim: ClaimItem): ClaimDraft => ({
  status: claim.status,
  conclusion: claim.claim.conclusion ?? '',
  note: claim.claim.note ?? '',
  reasoning: claim.claim.reasoning ?? '',
  confidence:
    claim.claim.confidence === null || claim.claim.confidence === undefined
      ? ''
      : String(claim.claim.confidence),
});

export const validateDraft = (draft: ClaimDraft): ClaimDraftErrors => {
  const errors: ClaimDraftErrors = {};
  const settled = draft.status === 'supported' || draft.status === 'refuted';
  if (settled && draft.conclusion.trim().length === 0) {
    errors.conclusion = i18n.ERROR_CONCLUSION_REQUIRED;
  }
  if (draft.status === 'blocked' && draft.note.trim().length === 0) {
    errors.note = i18n.ERROR_NOTE_REQUIRED;
  }
  if (draft.confidence.trim().length > 0) {
    const value = Number(draft.confidence);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors.confidence = i18n.ERROR_CONFIDENCE_RANGE;
    }
  }
  return errors;
};

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const isDraftChanged = (claim: ClaimItem, draft: ClaimDraft): boolean => {
  const original = draftFromClaim(claim);
  return (
    original.status !== draft.status ||
    original.conclusion.trim() !== draft.conclusion.trim() ||
    original.note.trim() !== draft.note.trim() ||
    original.reasoning.trim() !== draft.reasoning.trim() ||
    original.confidence.trim() !== draft.confidence.trim()
  );
};

/** A person's edit settles the review: it clears `needs_review`. */
export const draftToPatch = (draft: ClaimDraft): ItemPatch => ({
  status: draft.status,
  claim: {
    conclusion: emptyToNull(draft.conclusion),
    note: emptyToNull(draft.note),
    reasoning: emptyToNull(draft.reasoning),
    confidence: draft.confidence.trim().length > 0 ? Number(draft.confidence) : null,
    needs_review: false,
  },
});

const NOTE_LABELS: Record<ClaimStatus, string> = {
  open: i18n.FIELD_NOTE_OPEN,
  supported: i18n.FIELD_NOTE,
  blocked: i18n.FIELD_NOTE_BLOCKED,
  refuted: i18n.FIELD_NOTE_REFUTED,
};

const toClaimStatus = (id: string, fallback: ClaimStatus): ClaimStatus =>
  CLAIM_STATUSES.find((status) => status === id) ?? fallback;

export interface ClaimEditFormProps {
  draft: ClaimDraft;
  errors: ClaimDraftErrors;
  showErrors: boolean;
  onChange: (draft: ClaimDraft) => void;
}

/** Edits status, conclusion, note, reasoning and confidence of a claim. */
export const ClaimEditForm: React.FC<ClaimEditFormProps> = ({
  draft,
  errors,
  showErrors,
  onChange,
}) => {
  const settled = draft.status === 'supported' || draft.status === 'refuted';

  return (
    <div data-test-subj="investigationClaimEditForm">
      <EuiFormRow label={i18n.FIELD_STATUS} fullWidth>
        <EuiButtonGroup
          legend={i18n.FIELD_STATUS}
          idSelected={draft.status}
          onChange={(id) => onChange({ ...draft, status: toClaimStatus(id, draft.status) })}
          buttonSize="compressed"
          options={CLAIM_STATUSES.map((status) => ({
            id: status,
            label: CLAIM_STATUS_LABELS[status],
            'data-test-subj': `investigationClaimStatus-${status}`,
          }))}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.FIELD_CONCLUSION}
        helpText={settled ? i18n.HELP_CONCLUSION : i18n.HELP_CONCLUSION_OPTIONAL}
        isInvalid={showErrors && errors.conclusion !== undefined}
        error={errors.conclusion}
        fullWidth
      >
        <EuiTextArea
          fullWidth
          rows={3}
          maxLength={INVESTIGATION_LIMITS.maxTextLength}
          value={draft.conclusion}
          isInvalid={showErrors && errors.conclusion !== undefined}
          onChange={(event) => onChange({ ...draft, conclusion: event.target.value })}
          data-test-subj="investigationClaimConclusionInput"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={NOTE_LABELS[draft.status]}
        isInvalid={showErrors && errors.note !== undefined}
        error={errors.note}
        fullWidth
      >
        <EuiTextArea
          fullWidth
          rows={2}
          maxLength={INVESTIGATION_LIMITS.maxTextLength}
          value={draft.note}
          isInvalid={showErrors && errors.note !== undefined}
          onChange={(event) => onChange({ ...draft, note: event.target.value })}
          data-test-subj="investigationClaimNoteInput"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label={i18n.FIELD_REASONING} helpText={i18n.HELP_REASONING} fullWidth>
        <EuiTextArea
          fullWidth
          rows={3}
          maxLength={INVESTIGATION_LIMITS.maxTextLength}
          value={draft.reasoning}
          onChange={(event) => onChange({ ...draft, reasoning: event.target.value })}
          data-test-subj="investigationClaimReasoningInput"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.FIELD_CONFIDENCE}
        helpText={i18n.HELP_CONFIDENCE}
        isInvalid={showErrors && errors.confidence !== undefined}
        error={errors.confidence}
      >
        <EuiFieldNumber
          min={0}
          max={100}
          step={1}
          append="%"
          value={draft.confidence}
          isInvalid={showErrors && errors.confidence !== undefined}
          onChange={(event) => onChange({ ...draft, confidence: event.target.value })}
          data-test-subj="investigationClaimConfidenceInput"
        />
      </EuiFormRow>
    </div>
  );
};
ClaimEditForm.displayName = 'ClaimEditForm';
