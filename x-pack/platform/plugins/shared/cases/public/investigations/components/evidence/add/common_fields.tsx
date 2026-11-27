/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFieldText, EuiFormRow, EuiSelect, EuiSpacer, EuiText, EuiTextArea } from '@elastic/eui';
import type { ClaimItem } from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import * as i18n from '../translations';

const OptionalLabel: React.FC = () => (
  <EuiText size="xs" color="subdued" component="span">
    {i18n.OPTIONAL}
  </EuiText>
);
OptionalLabel.displayName = 'OptionalLabel';

export interface WhyFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export const WhyField: React.FC<WhyFieldProps> = ({ value, onChange }) => (
  <EuiFormRow
    label={i18n.WHY_LABEL}
    labelAppend={<OptionalLabel />}
    helpText={i18n.WHY_HELP}
    fullWidth
  >
    <EuiTextArea
      fullWidth
      rows={2}
      value={value}
      maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
      onChange={(event) => onChange(event.target.value)}
      data-test-subj="investigationEvidenceAddWhy"
    />
  </EuiFormRow>
);
WhyField.displayName = 'WhyField';

export interface TitleFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  isOptional?: boolean;
}

export const TitleField: React.FC<TitleFieldProps> = ({
  value,
  onChange,
  error,
  placeholder,
  isOptional = false,
}) => (
  <EuiFormRow
    label={i18n.TITLE_LABEL}
    labelAppend={isOptional ? <OptionalLabel /> : undefined}
    isInvalid={Boolean(error)}
    error={error}
    fullWidth
  >
    <EuiFieldText
      fullWidth
      value={value}
      isInvalid={Boolean(error)}
      placeholder={placeholder}
      maxLength={INVESTIGATION_LIMITS.maxTitleLength}
      onChange={(event) => onChange(event.target.value)}
      data-test-subj="investigationEvidenceAddTitle"
    />
  </EuiFormRow>
);
TitleField.displayName = 'TitleField';

const NO_CLAIM = '';

export interface ClaimLinkFieldProps {
  claims: ClaimItem[];
  value: string;
  onChange: (claimId: string) => void;
}

export const ClaimLinkField: React.FC<ClaimLinkFieldProps> = ({ claims, value, onChange }) => {
  const options = useMemo(
    () => [
      { value: NO_CLAIM, text: i18n.DO_NOT_LINK },
      ...claims.map((claim) => ({
        value: claim.id,
        text: `${claim.ref}: ${claim.title.slice(0, 80)}`,
      })),
    ],
    [claims]
  );

  if (claims.length === 0) {
    return null;
  }

  return (
    <EuiFormRow label={i18n.LINK_TO_CLAIM_LABEL} labelAppend={<OptionalLabel />} fullWidth>
      <EuiSelect
        fullWidth
        options={options}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        data-test-subj="investigationEvidenceAddClaim"
      />
    </EuiFormRow>
  );
};
ClaimLinkField.displayName = 'ClaimLinkField';

/** The "why" and "link to claim" fields every kind shares, below the kind-specific fields. */
export const SharedFields: React.FC<
  WhyFieldProps & { claims: ClaimItem[]; claimId: string; onClaimChange: (claimId: string) => void }
> = ({ value, onChange, claims, claimId, onClaimChange }) => (
  <>
    <EuiSpacer size="m" />
    <WhyField value={value} onChange={onChange} />
    <ClaimLinkField claims={claims} value={claimId} onChange={onClaimChange} />
  </>
);
SharedFields.displayName = 'SharedFields';
