/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiRadioGroup,
  EuiIconTip,
  EuiSpacer,
  EuiButtonEmpty,
  EuiCodeBlock,
} from '@elastic/eui';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { RuleFormServices } from '../rule_form';
import type { FormValues, RecoveryPolicyType } from '../types';
import { useRecoveryQueryValidation } from '../hooks/use_recovery_query_validation';
import { RecoveryQueryEditorFlyout } from './recovery_query_editor_flyout';

const RECOVERY_TYPE_OPTIONS: Array<{ id: RecoveryPolicyType; label: string }> = [
  {
    id: 'no_breach',
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryTypeNoBreach', {
      defaultMessage: 'No breach (default)',
    }),
  },
  {
    id: 'query',
    label: i18n.translate('xpack.alertingV2.ruleForm.recoveryTypeQuery', {
      defaultMessage: 'Custom query',
    }),
  },
];

interface RecoveryPolicyFieldProps {
  services: RuleFormServices;
}

export const RecoveryPolicyField: React.FC<RecoveryPolicyFieldProps> = ({ services }) => {
  const { control, setValue, getValues, setError, clearErrors } = useFormContext<FormValues>();
  const recoveryType = useWatch({ control, name: 'recoveryPolicy.type' });
  const recoveryQuery = useWatch({ control, name: 'recoveryPolicy.query' });

  const [isEditorFlyoutOpen, setIsEditorFlyoutOpen] = useState(false);
  const [initialFlyoutQuery, setInitialFlyoutQuery] = useState<string>('');
  const prevRecoveryType = useRef<RecoveryPolicyType | undefined>(recoveryType);

  // Validate the saved query - this catches when grouping fields change after the query is saved
  const { validationError } = useRecoveryQueryValidation({
    control,
    setError,
    clearErrors,
    search: services.data.search.search,
    query: recoveryQuery ?? '',
  });

  // Get the default query - use recovery query if set, otherwise fall back to evaluation query
  const getDefaultQuery = useCallback(() => {
    const existingRecoveryQuery = getValues('recoveryPolicy.query');
    if (existingRecoveryQuery) {
      return existingRecoveryQuery;
    }
    // Default to the evaluation query
    return getValues('evaluation.query.base') ?? '';
  }, [getValues]);

  // Open flyout automatically when switching to 'query' type
  useEffect(() => {
    if (recoveryType === 'query' && prevRecoveryType.current !== 'query') {
      setInitialFlyoutQuery(getDefaultQuery());
      setIsEditorFlyoutOpen(true);
    }
    prevRecoveryType.current = recoveryType;
  }, [recoveryType, getDefaultQuery]);

  const handleOpenEditor = useCallback(() => {
    setInitialFlyoutQuery(getDefaultQuery());
    setIsEditorFlyoutOpen(true);
  }, [getDefaultQuery]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorFlyoutOpen(false);
    setInitialFlyoutQuery('');
    // If no query was defined, revert back to no_breach
    if (!getValues('recoveryPolicy.query')) {
      setValue('recoveryPolicy.type', 'no_breach');
    }
  }, [getValues, setValue]);

  const handleSaveQuery = useCallback(
    (query: string | undefined) => {
      setValue('recoveryPolicy.query', query);
      setIsEditorFlyoutOpen(false);
      setInitialFlyoutQuery('');
    },
    [setValue]
  );

  return (
    <>
      <Controller
        control={control}
        name="recoveryPolicy.type"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <EuiFormRow
            label={
              <>
                {i18n.translate('xpack.alertingV2.ruleForm.recoveryTypeLabel', {
                  defaultMessage: 'Recovery detection',
                })}
                &nbsp;
                <EuiIconTip
                  position="right"
                  type="question"
                  content={i18n.translate('xpack.alertingV2.ruleForm.recoveryTypeTooltip', {
                    defaultMessage:
                      'Choose how to detect when an alert should recover. "No breach" recovers when the alert condition is no longer met. "Custom query" allows you to define a specific recovery condition.',
                  })}
                />
              </>
            }
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiRadioGroup
              name="recoveryPolicyType"
              options={RECOVERY_TYPE_OPTIONS}
              idSelected={value ?? 'no_breach'}
              onChange={(id) => onChange(id as RecoveryPolicyType)}
            />
          </EuiFormRow>
        )}
      />

      {recoveryType === 'query' && recoveryQuery && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.recoveryQueryLabel', {
              defaultMessage: 'Recovery query',
            })}
            fullWidth
            isInvalid={!!validationError}
            error={validationError}
          >
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
              {recoveryQuery}
            </EuiCodeBlock>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            iconType="pencil"
            onClick={handleOpenEditor}
            data-test-subj="editRecoveryQueryButton"
          >
            {i18n.translate('xpack.alertingV2.ruleForm.editRecoveryQueryButton', {
              defaultMessage: 'Edit query',
            })}
          </EuiButtonEmpty>
        </>
      )}

      {isEditorFlyoutOpen && (
        <RecoveryQueryEditorFlyout
          initialQuery={initialFlyoutQuery}
          services={services}
          onSave={handleSaveQuery}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
};
