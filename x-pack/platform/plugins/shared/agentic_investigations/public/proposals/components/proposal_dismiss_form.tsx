/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFormRow, EuiSelect, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { dismissReasonSchema } from '../../../common';
import type { DismissReason } from '../../../common';

/** Human-readable labels for each dismiss reason value. */
const DISMISS_REASON_LABELS: Record<DismissReason, string> = {
  wrong: i18n.translate('xpack.agenticInvestigations.proposalCard.dismissReason.wrong', {
    defaultMessage: 'Wrong',
  }),
  duplicate: i18n.translate('xpack.agenticInvestigations.proposalCard.dismissReason.duplicate', {
    defaultMessage: 'Duplicate',
  }),
  insufficient_evidence: i18n.translate(
    'xpack.agenticInvestigations.proposalCard.dismissReason.insufficientEvidence',
    { defaultMessage: 'Insufficient evidence' }
  ),
  low_value: i18n.translate('xpack.agenticInvestigations.proposalCard.dismissReason.lowValue', {
    defaultMessage: 'Low value',
  }),
  out_of_scope: i18n.translate(
    'xpack.agenticInvestigations.proposalCard.dismissReason.outOfScope',
    { defaultMessage: 'Out of scope' }
  ),
  already_handled: i18n.translate(
    'xpack.agenticInvestigations.proposalCard.dismissReason.alreadyHandled',
    { defaultMessage: 'Already handled' }
  ),
  other: i18n.translate('xpack.agenticInvestigations.proposalCard.dismissReason.other', {
    defaultMessage: 'Other',
  }),
};

const DISMISS_REASON_OPTIONS = dismissReasonSchema.options.map((value) => ({
  value,
  text: DISMISS_REASON_LABELS[value as DismissReason],
}));

export interface ProposalDismissFormProps {
  dismissReason: DismissReason;
  rationale: string;
  onDismissReasonChange: (reason: DismissReason) => void;
  onRationaleChange: (rationale: string) => void;
  'data-test-subj'?: string;
}

/**
 * Inline form shown when the analyst clicks Dismiss inside a proposal card.
 * Contains a reason select and an optional rationale textarea.
 */
export const ProposalDismissForm = memo<ProposalDismissFormProps>(
  ({
    dismissReason,
    rationale,
    onDismissReasonChange,
    onRationaleChange,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <div
        css={css({ padding: `0 ${euiTheme.size.m}`, paddingBottom: euiTheme.size.m })}
        data-test-subj={dataTestSubj}
      >
        <EuiFormRow
          label={i18n.translate('xpack.agenticInvestigations.proposalCard.dismissReasonLabel', {
            defaultMessage: 'Reason',
          })}
        >
          <EuiSelect
            options={DISMISS_REASON_OPTIONS}
            value={dismissReason}
            onChange={(e) => onDismissReasonChange(e.target.value as DismissReason)}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-reason` : undefined}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.translate('xpack.agenticInvestigations.proposalCard.rationaleLabel', {
            defaultMessage: 'Rationale',
          })}
          helpText={i18n.translate('xpack.agenticInvestigations.proposalCard.rationaleHelpText', {
            defaultMessage: 'Optional — explain why this proposal is being dismissed.',
          })}
        >
          <EuiTextArea
            value={rationale}
            onChange={(e) => onRationaleChange(e.target.value)}
            placeholder={i18n.translate(
              'xpack.agenticInvestigations.proposalCard.rationalePlaceholder',
              { defaultMessage: 'Why is this proposal being dismissed?' }
            )}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-rationale` : undefined}
          />
        </EuiFormRow>
      </div>
    );
  }
);

ProposalDismissForm.displayName = 'ProposalDismissForm';
