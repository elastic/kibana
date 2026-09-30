/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiForm, EuiFormRow, EuiRadioGroup, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DismissReason } from '@kbn/proposals-common';
import { DISMISS_REASON_OPTIONS } from './dismiss_reason';

export interface DeclineReasonFormProps {
  dismissReason: DismissReason;
  rationale: string;
  onDismissReasonChange: (reason: DismissReason) => void;
  onRationaleChange: (rationale: string) => void;
  'data-test-subj'?: string;
}

const RADIO_OPTIONS = DISMISS_REASON_OPTIONS.map(({ id, label }) => ({ id, label }));

/**
 * Shown in place of the approval modal's body once the analyst clicks Decline. A reason is
 * always selected (`no_reason` by default), so the free-text field is optional for every reason
 * except `other` — there, it is the only detail the record carries, so it becomes required.
 */
export const DeclineReasonForm = memo<DeclineReasonFormProps>(
  ({
    dismissReason,
    rationale,
    onDismissReasonChange,
    onRationaleChange,
    'data-test-subj': dataTestSubj,
  }) => {
    const { euiTheme } = useEuiTheme();
    const rationaleRequired = dismissReason === 'other';
    const showRationaleError = rationaleRequired && rationale.trim() === '';

    return (
      <EuiForm
        component="form"
        data-test-subj={dataTestSubj}
        style={{ padding: `${euiTheme.size.base}` }}
      >
        <EuiRadioGroup
          name="declineReason"
          options={RADIO_OPTIONS}
          idSelected={dismissReason}
          onChange={(id) => onDismissReasonChange(id as DismissReason)}
          data-test-subj={dataTestSubj ? `${dataTestSubj}-reason` : undefined}
        />
        <EuiFormRow
          fullWidth
          css={css({ marginTop: euiTheme.size.m })}
          isInvalid={showRationaleError}
          error={
            showRationaleError
              ? i18n.translate('xpack.proposals.declineReasonForm.rationaleError', {
                  defaultMessage: 'A reason is required when declining as Other.',
                })
              : undefined
          }
        >
          <EuiTextArea
            fullWidth
            compressed
            value={rationale}
            isInvalid={showRationaleError}
            aria-required={rationaleRequired}
            onChange={(e) => onRationaleChange(e.target.value)}
            placeholder={
              rationaleRequired
                ? i18n.translate('xpack.proposals.declineReasonForm.rationalePlaceholderRequired', {
                    defaultMessage: 'Describe why (required for Other)',
                  })
                : i18n.translate('xpack.proposals.declineReasonForm.rationalePlaceholderOptional', {
                    defaultMessage: 'Add detail (optional)',
                  })
            }
            data-test-subj={dataTestSubj ? `${dataTestSubj}-rationale` : undefined}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

DeclineReasonForm.displayName = 'DeclineReasonForm';
