/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import { EuiFormRow, EuiSelect, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from '../dismiss_reason_i18n';

export interface ProposalDismissFormProps {
  dismissReason: DismissReason;
  rationale: string;
  onDismissReasonChange: (reason: DismissReason) => void;
  onRationaleChange: (rationale: string) => void;
  'data-test-subj'?: string;
}

/**
 * Inline form shown when the analyst clicks Dismiss inside a proposal card.
 * Contains a reason select and a rationale textarea.
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
    const [touched, setTouched] = useState(false);
    const isRationaleEmpty = !rationale.trim();
    const showError = touched && isRationaleEmpty;

    return (
      <div
        css={css({ padding: `0 ${euiTheme.size.m}`, paddingBottom: euiTheme.size.m })}
        data-test-subj={dataTestSubj}
      >
        <EuiFormRow
          label={i18n.translate('xpack.proposals.proposalCard.dismissReasonLabel', {
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
          label={i18n.translate('xpack.proposals.proposalCard.rationaleLabel', {
            defaultMessage: 'Rationale',
          })}
          helpText={i18n.translate('xpack.proposals.proposalCard.rationaleHelpText', {
            defaultMessage: 'Required for auditing — explain why this proposal is being dismissed.',
          })}
          isInvalid={showError}
          error={
            showError
              ? i18n.translate('xpack.proposals.proposalCard.rationaleError', {
                  defaultMessage: 'A rationale is required.',
                })
              : undefined
          }
        >
          <EuiTextArea
            value={rationale}
            isInvalid={showError}
            aria-required
            onBlur={() => setTouched(true)}
            onChange={(e) => onRationaleChange(e.target.value)}
            placeholder={i18n.translate('xpack.proposals.proposalCard.rationalePlaceholder', {
              defaultMessage: 'Why is this proposal being dismissed?',
            })}
            data-test-subj={dataTestSubj ? `${dataTestSubj}-rationale` : undefined}
          />
        </EuiFormRow>
      </div>
    );
  }
);

ProposalDismissForm.displayName = 'ProposalDismissForm';
