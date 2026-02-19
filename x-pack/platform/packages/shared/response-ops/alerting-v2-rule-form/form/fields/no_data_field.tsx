/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFormRow,
  EuiSelect,
  EuiIconTip,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCodeBlock,
} from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { RuleFormServices } from '../rule_form';
import type { FormValues, NoDataBehavior } from '../types';
import { useNoDataQueryValidation } from '../hooks/use_no_data_query_validation';
import { LookbackWindow } from './lookback_window';
import { NoDataQueryEditorFlyout } from './no_data_query_editor_flyout';

const DEFAULT_NO_DATA_BEHAVIOR: NoDataBehavior = 'no_data';
const DEFAULT_NO_DATA_TIMEFRAME = '5m';

const NO_DATA_BEHAVIOR_OPTIONS: Array<{ value: NoDataBehavior; text: string }> = [
  {
    value: 'no_data',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorNoData', {
      defaultMessage: 'Create "No data" alert',
    }),
  },
  {
    value: 'last_status',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorLastStatus', {
      defaultMessage: 'Keep last status',
    }),
  },
  {
    value: 'recover',
    text: i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorRecover', {
      defaultMessage: 'Recover alert',
    }),
  },
];

interface NoDataFieldProps {
  services: RuleFormServices;
}

/**
 * Field component for configuring no data handling behavior.
 * Shows a button to add configuration, then expands to show behavior, lookback window, and query fields.
 * User can remove the configuration to set values back to undefined.
 */
export const NoDataField: React.FC<NoDataFieldProps> = ({ services }) => {
  const { control, watch, setValue, getValues, setError, clearErrors } =
    useFormContext<FormValues>();
  const noDataBehavior = watch('noData.behavior');
  const noDataTimeframe = watch('noData.timeframe');
  const noDataQuery = watch('noData.query');

  const [isEditorFlyoutOpen, setIsEditorFlyoutOpen] = useState(false);
  const [initialFlyoutQuery, setInitialFlyoutQuery] = useState<string>('');

  // Validate the saved query - this catches when grouping fields change after the query is saved
  const { validationError } = useNoDataQueryValidation({
    control,
    setError,
    clearErrors,
    search: services.data.search.search,
    query: noDataQuery ?? '',
  });

  // Show the inputs if there's already a no data configuration
  const [isConfigVisible, setIsConfigVisible] = useState(
    () => Boolean(noDataBehavior) || Boolean(noDataTimeframe) || Boolean(noDataQuery)
  );

  // Update visibility if values change externally (e.g., form reset with existing data)
  useEffect(() => {
    if ((noDataBehavior || noDataTimeframe || noDataQuery) && !isConfigVisible) {
      setIsConfigVisible(true);
    }
  }, [noDataBehavior, noDataTimeframe, noDataQuery, isConfigVisible]);

  // Get the default query - use existing no data query if set, otherwise fall back to evaluation query
  const getDefaultQuery = useCallback(() => {
    const existingQuery = getValues('noData.query');
    if (existingQuery) {
      return existingQuery;
    }
    // Default to the evaluation query
    return getValues('evaluation.query.base') ?? '';
  }, [getValues]);

  const handleAddNoDataConfig = useCallback(() => {
    // Set default values when adding (but don't set query yet - wait for flyout apply)
    const evaluationQuery = getValues('evaluation.query.base') ?? '';
    setValue('noData.behavior', DEFAULT_NO_DATA_BEHAVIOR);
    setValue('noData.timeframe', DEFAULT_NO_DATA_TIMEFRAME);
    setIsConfigVisible(true);
    // Open the flyout immediately so user can review/edit the query
    setInitialFlyoutQuery(evaluationQuery);
    setIsEditorFlyoutOpen(true);
  }, [setValue, getValues]);

  const handleRemoveNoDataConfig = useCallback(() => {
    // Clear values when removing
    setValue('noData.behavior', undefined);
    setValue('noData.timeframe', undefined);
    setValue('noData.query', undefined);
    setIsConfigVisible(false);
  }, [setValue]);

  const handleOpenEditor = useCallback(() => {
    setInitialFlyoutQuery(getDefaultQuery());
    setIsEditorFlyoutOpen(true);
  }, [getDefaultQuery]);

  const handleCloseEditor = useCallback(() => {
    setIsEditorFlyoutOpen(false);
    setInitialFlyoutQuery('');
    // If no query was saved yet, revert the entire config (query is required)
    if (!getValues('noData.query')) {
      setValue('noData.behavior', undefined);
      setValue('noData.timeframe', undefined);
      setIsConfigVisible(false);
    }
  }, [getValues, setValue]);

  const handleSaveQuery = useCallback(
    (query: string) => {
      setValue('noData.query', query);
      setIsEditorFlyoutOpen(false);
      setInitialFlyoutQuery('');
    },
    [setValue]
  );

  if (!isConfigVisible) {
    return (
      <EuiFormRow
        label={
          <>
            {i18n.translate('xpack.alertingV2.ruleForm.noDataHandlingLabel', {
              defaultMessage: 'No data handling',
            })}
            &nbsp;
            <EuiIconTip
              position="right"
              type="question"
              content={i18n.translate('xpack.alertingV2.ruleForm.noDataHandlingTooltip', {
                defaultMessage:
                  'Configure how the rule behaves when no data is received within a specified timeframe.',
              })}
            />
          </>
        }
      >
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={handleAddNoDataConfig}
          size="xs"
          data-test-subj="addNoDataConfigButton"
          color="text"
        >
          {i18n.translate('xpack.alertingV2.ruleForm.addNoDataConfigButton', {
            defaultMessage: 'Add no data handling',
          })}
        </EuiButtonEmpty>
      </EuiFormRow>
    );
  }

  return (
    <>
      <Controller
        control={control}
        name="noData.behavior"
        render={({ field: { value, onChange }, fieldState: { error } }) => (
          <EuiFormRow
            label={
              <>
                {i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorLabel', {
                  defaultMessage: 'No data behavior',
                })}
                &nbsp;
                <EuiIconTip
                  position="right"
                  type="question"
                  content={i18n.translate('xpack.alertingV2.ruleForm.noDataBehaviorTooltip', {
                    defaultMessage:
                      'Determines what happens when no data is received within the specified timeframe. "Create No data alert" changes the alert event status to "no_data". "Keep last status" maintains the current alert state. "Recover alert" automatically recovers any active alerts.',
                  })}
                />
              </>
            }
            isInvalid={!!error}
            error={error?.message}
          >
            <EuiSelect
              options={NO_DATA_BEHAVIOR_OPTIONS}
              value={value ?? DEFAULT_NO_DATA_BEHAVIOR}
              onChange={(e) => onChange(e.target.value as NoDataBehavior)}
              data-test-subj="noDataBehaviorSelect"
            />
          </EuiFormRow>
        )}
      />
      <Controller
        control={control}
        name="noData.timeframe"
        render={({ field, fieldState: { error } }) => (
          <EuiFormRow
            label={
              <>
                {i18n.translate('xpack.alertingV2.ruleForm.noDataLookbackWindowLabel', {
                  defaultMessage: 'No data lookback window',
                })}
                &nbsp;
                <EuiIconTip
                  position="right"
                  type="question"
                  content={i18n.translate('xpack.alertingV2.ruleForm.noDataLookbackWindowTooltip', {
                    defaultMessage:
                      'The time window after which no data is detected. If no data is received within this period, the configured behavior will be triggered.',
                  })}
                />
              </>
            }
            isInvalid={!!error}
            error={error?.message}
          >
            <LookbackWindow
              value={field.value ?? DEFAULT_NO_DATA_TIMEFRAME}
              onChange={field.onChange}
              errors={error?.message}
            />
          </EuiFormRow>
        )}
      />

      {noDataQuery && (
        <>
          <EuiSpacer size="m" />
          <EuiFormRow
            label={i18n.translate('xpack.alertingV2.ruleForm.noDataQueryLabel', {
              defaultMessage: 'No data query',
            })}
            fullWidth
            isInvalid={!!validationError}
            error={validationError}
          >
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="m" isCopyable>
              {noDataQuery}
            </EuiCodeBlock>
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="s"
            iconType="pencil"
            onClick={handleOpenEditor}
            data-test-subj="editNoDataQueryButton"
          >
            {i18n.translate('xpack.alertingV2.ruleForm.editNoDataQueryButton', {
              defaultMessage: 'Edit query',
            })}
          </EuiButtonEmpty>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiButtonEmpty
        iconType="trash"
        onClick={handleRemoveNoDataConfig}
        size="s"
        color="danger"
        data-test-subj="removeNoDataConfigButton"
      >
        {i18n.translate('xpack.alertingV2.ruleForm.removeNoDataConfigButton', {
          defaultMessage: 'Remove',
        })}
      </EuiButtonEmpty>

      {isEditorFlyoutOpen && (
        <NoDataQueryEditorFlyout
          initialQuery={initialFlyoutQuery}
          services={services}
          onSave={handleSaveQuery}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
};
