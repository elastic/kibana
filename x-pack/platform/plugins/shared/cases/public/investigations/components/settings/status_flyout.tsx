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
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import {
  CASE_STATUS_CATEGORY_LABELS,
  MAX_CASE_STATUS_LABEL_LENGTH,
} from '../../../../common/investigations/statuses';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type { InvestigationStatus } from '../../../../common/investigations/types';
import { isLabelTaken } from './status_utils';
import * as i18n from './translations';

export interface StatusFlyoutProps {
  category: InvestigationStatus;
  /** The status being edited; undefined when adding one. */
  status?: CaseStatusConfiguration;
  statuses: CaseStatusConfiguration[];
  isSaving: boolean;
  /** Message of the last failed save, shown inside the flyout. */
  error?: string;
  onSubmit: (values: { label: string; pausesTimeTracking: boolean }) => void;
  onClose: () => void;
}

const validateLabel = (
  label: string,
  category: InvestigationStatus,
  statuses: CaseStatusConfiguration[],
  ignoreKey: string | undefined
): string | undefined => {
  const trimmed = label.trim();
  if (trimmed.length === 0) return i18n.LABEL_REQUIRED;
  if (trimmed.length > MAX_CASE_STATUS_LABEL_LENGTH) {
    return i18n.LABEL_TOO_LONG(MAX_CASE_STATUS_LABEL_LENGTH);
  }
  if (isLabelTaken(statuses, category, trimmed, ignoreKey)) {
    return i18n.LABEL_DUPLICATE(CASE_STATUS_CATEGORY_LABELS[category]);
  }
  return undefined;
};

/** The "Add status under {category}" and "Edit status" flyout. */
export const StatusFlyout: React.FC<StatusFlyoutProps> = ({
  category,
  status,
  statuses,
  isSaving,
  error,
  onSubmit,
  onClose,
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'investigationStatusFlyoutTitle' });
  const [label, setLabel] = useState(status?.label ?? '');
  const [pauses, setPauses] = useState(Boolean(status?.pausesTimeTracking));
  const [showErrors, setShowErrors] = useState(false);

  const labelError = validateLabel(label, category, statuses, status?.key);
  const visibleLabelError = showErrors ? labelError : undefined;
  const canPause = category !== 'closed';
  const isDefault = Boolean(status?.isDefault);

  const submit = () => {
    setShowErrors(true);
    if (labelError) {
      return;
    }
    onSubmit({ label: label.trim(), pausesTimeTracking: canPause && !isDefault && pauses });
  };

  return (
    <EuiFlyout
      onClose={onClose}
      size="s"
      ownFocus
      aria-labelledby={titleId}
      data-test-subj="investigationStatusFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {status
              ? i18n.EDIT_STATUS_TITLE
              : i18n.ADD_STATUS_TITLE(CASE_STATUS_CATEGORY_LABELS[category])}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiForm
          component="form"
          fullWidth
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          {error ? (
            <>
              <EuiCallOut
                announceOnMount
                color="danger"
                size="s"
                title={error}
                data-test-subj="investigationStatusFlyoutError"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow
            label={i18n.LABEL_FIELD}
            helpText={i18n.LABEL_HELP}
            fullWidth
            isInvalid={Boolean(visibleLabelError)}
            error={visibleLabelError}
          >
            <EuiFieldText
              fullWidth
              autoFocus
              value={label}
              isInvalid={Boolean(visibleLabelError)}
              onChange={(event) => setLabel(event.target.value)}
              data-test-subj="investigationStatusLabel"
            />
          </EuiFormRow>
          {status ? (
            <EuiFormRow label={i18n.API_VALUE_FIELD} helpText={i18n.API_VALUE_HELP} fullWidth>
              <EuiFieldText
                fullWidth
                readOnly
                value={status.key}
                data-test-subj="investigationStatusApiValue"
              />
            </EuiFormRow>
          ) : null}
          {canPause ? (
            <EuiFormRow
              fullWidth
              helpText={isDefault ? i18n.PAUSES_DEFAULT_HELP : i18n.PAUSES_HELP}
            >
              <EuiSwitch
                label={i18n.PAUSES_TIME_TRACKING}
                checked={pauses && !isDefault}
                disabled={isDefault}
                onChange={(event) => setPauses(event.target.checked)}
                data-test-subj="investigationStatusPauses"
              />
            </EuiFormRow>
          ) : null}
        </EuiForm>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="investigationStatusCancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              isLoading={isSaving}
              onClick={submit}
              data-test-subj="investigationStatusSubmit"
            >
              {status ? i18n.SAVE : i18n.ADD_STATUS}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
StatusFlyout.displayName = 'StatusFlyout';
