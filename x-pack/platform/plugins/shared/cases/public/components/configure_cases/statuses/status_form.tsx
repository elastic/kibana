/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField, ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { MAX_CASE_STATUS_LABEL_LENGTH } from '../../../../common/constants';
import type { CaseStatusConfiguration } from '../../../../common/types/domain';
import { CaseStatuses } from '../../../../common/types/domain';
import type { FormState } from '../flyout';
import * as i18n from './translations';

export interface StatusFormData {
  label: string;
  pausesTimeTracking: boolean;
}

export interface StatusFormProps {
  onChange: (state: FormState<StatusFormData>) => void;
  /** The status being renamed; null when adding one */
  status: CaseStatusConfiguration | null;
  /** The category the status belongs to */
  category: CaseStatuses;
  /** Display name of the category the status belongs to, for messages */
  categoryLabel: string;
  /** Labels already used in the category, excluding the status being edited */
  takenLabels: string[];
}

const { emptyField, maxLengthField } = fieldValidators;

const normalizeLabel = (label: string) => label.trim().toLowerCase();

const StatusFormComponent: React.FC<StatusFormProps> = ({
  onChange,
  status,
  category,
  categoryLabel,
  takenLabels,
}) => {
  const schema = useMemo(
    () => ({
      label: {
        label: i18n.LABEL,
        helpText: i18n.LABEL_HELP,
        validations: [
          { validator: emptyField(i18n.REQUIRED_LABEL) },
          {
            validator: maxLengthField({
              length: MAX_CASE_STATUS_LABEL_LENGTH,
              message: i18n.MAX_LABEL_LENGTH(MAX_CASE_STATUS_LABEL_LENGTH),
            }),
          },
          {
            validator: ({ value }: { value: string }) =>
              takenLabels.map(normalizeLabel).includes(normalizeLabel(value))
                ? { message: i18n.DUPLICATE_LABEL(categoryLabel) }
                : undefined,
          },
        ],
      },
    }),
    [categoryLabel, takenLabels]
  );

  const { form } = useForm<StatusFormData>({
    defaultValue: {
      label: status?.label ?? '',
      pausesTimeTracking: status?.pausesTimeTracking ?? false,
    },
    options: { stripEmptyFields: false },
    schema,
  });
  // Closed statuses already stop every clock, and defaults are applied without a reason.
  const canPause = category !== CaseStatuses.closed;
  const isDefault = status?.isDefault === true;

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    onChange({ isValid, submit });
  }, [onChange, isValid, submit]);

  return (
    <Form form={form} data-test-subj="case-status-form">
      <UseField
        path="label"
        component={TextField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'case-status-label-input',
            fullWidth: true,
            autoFocus: true,
            isLoading: isSubmitting,
          },
        }}
      />
      {status != null && (
        <EuiFormRow label={i18n.API_VALUE} helpText={i18n.API_VALUE_HELP} fullWidth>
          <EuiFieldText
            value={status.key}
            readOnly
            fullWidth
            data-test-subj="case-status-key-readonly"
          />
        </EuiFormRow>
      )}
      {canPause && (
        <UseField
          path="pausesTimeTracking"
          component={ToggleField}
          componentProps={{
            euiFieldProps: {
              label: i18n.PAUSES_TIME_TRACKING,
              disabled: isDefault || isSubmitting,
              'data-test-subj': 'case-status-pauses-time-tracking',
            },
            helpText: isDefault ? i18n.DEFAULT_CANNOT_PAUSE : i18n.PAUSES_TIME_TRACKING_HELP,
          }}
        />
      )}
    </Form>
  );
};

StatusFormComponent.displayName = 'StatusForm';

export const StatusForm = React.memo(StatusFormComponent);
