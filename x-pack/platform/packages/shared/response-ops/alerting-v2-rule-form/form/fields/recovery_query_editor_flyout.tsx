/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiSpacer,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiText,
} from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import type { RuleFormServices } from '../rule_form';
import type { FormValues } from '../types';
import { useRecoveryQueryValidation } from '../hooks/use_recovery_query_validation';
import { EsqlEditorField } from './esql_editor_field';

const LOADING_DEBOUNCE_MS = 300;

interface RecoveryQueryEditorFlyoutProps {
  /** Initial query value when flyout opens */
  initialQuery: string;
  /** Services for validation */
  services: RuleFormServices;
  /** Callback when query is saved */
  onSave: (query: string | undefined) => void;
  /** Callback when flyout is closed without saving */
  onClose: () => void;
}

/**
 * Flyout component for editing recovery ES|QL queries.
 * Manages its own draft state and validates the query against grouping fields.
 */
export const RecoveryQueryEditorFlyout: React.FC<RecoveryQueryEditorFlyoutProps> = ({
  initialQuery,
  services,
  onSave,
  onClose,
}) => {
  const { control, setError, clearErrors } = useFormContext<FormValues>();
  const [draftQuery, setDraftQuery] = useState<string>(initialQuery);

  // Validate that the draft query contains all grouping columns
  const { isValidating, validationError } = useRecoveryQueryValidation({
    control,
    setError,
    clearErrors,
    search: services.data.search.search,
    query: draftQuery,
  });

  // Debounce the loading state to prevent flickering on every keystroke
  const [debouncedIsValidating, setDebouncedIsValidating] = useState(false);

  useEffect(() => {
    if (isValidating) {
      // Delay showing the loading state
      const timeout = setTimeout(() => {
        setDebouncedIsValidating(true);
      }, LOADING_DEBOUNCE_MS);
      return () => clearTimeout(timeout);
    } else {
      // Clear loading state immediately when done
      setDebouncedIsValidating(false);
    }
  }, [isValidating]);

  const handleSave = useCallback(() => {
    onSave(draftQuery || undefined);
  }, [draftQuery, onSave]);

  return (
    <EuiFlyout
      flyoutMenuProps={{
        title: i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryFlyoutTitle', {
          defaultMessage: 'Recovery Query',
        }),
      }}
      onClose={onClose}
      size="m"
      aria-labelledby="recoveryQueryFlyoutTitle"
    >
      <EuiFlyoutBody>
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryFlyoutDescription', {
              defaultMessage:
                'Define an ES|QL query that determines when an alert should recover. The alert will transition to a recovered state when this query returns results.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="m" />
        <EsqlEditorField
          error={validationError}
          value={draftQuery}
          onChange={setDraftQuery}
          label={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryEditorLabel', {
            defaultMessage: 'ES|QL Query',
          })}
          helpText={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryEditorHelpText', {
            defaultMessage:
              'Enter a complete ES|QL query that returns data when recovery conditions are met',
          })}
          placeholder={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryPlaceholder', {
            defaultMessage: 'FROM logs-* | WHERE error_count < 10',
          })}
          dataTestSubj="recoveryQueryEditorInput"
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose}>
              {i18n.translate('xpack.alertingV2.ruleForm.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleSave} isLoading={debouncedIsValidating}>
              {i18n.translate('xpack.alertingV2.ruleForm.applyQueryButton', {
                defaultMessage: 'Apply query',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
