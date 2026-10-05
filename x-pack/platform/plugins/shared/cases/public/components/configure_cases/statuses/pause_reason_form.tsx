/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { Form, UseField, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { MAX_CASE_PAUSE_REASON_LENGTH } from '../../../../common/constants';
import type { FormState } from '../flyout';
import * as i18n from './translations';

export interface PauseReasonFormData {
  reason: string;
}

export interface PauseReasonFormProps {
  onChange: (state: FormState<PauseReasonFormData>) => void;
  /** The reason being renamed; null when adding one */
  reason: string | null;
  /** Reasons already configured, excluding the one being edited */
  takenReasons: string[];
}

const { emptyField, maxLengthField } = fieldValidators;

const normalize = (reason: string) => reason.trim().toLowerCase();

const PauseReasonFormComponent: React.FC<PauseReasonFormProps> = ({
  onChange,
  reason,
  takenReasons,
}) => {
  const schema = useMemo(
    () => ({
      reason: {
        label: i18n.REASON,
        validations: [
          { validator: emptyField(i18n.REQUIRED_REASON) },
          {
            validator: maxLengthField({
              length: MAX_CASE_PAUSE_REASON_LENGTH,
              message: i18n.MAX_REASON_LENGTH(MAX_CASE_PAUSE_REASON_LENGTH),
            }),
          },
          {
            validator: ({ value }: { value: string }) =>
              takenReasons.map(normalize).includes(normalize(value))
                ? { message: i18n.DUPLICATE_REASON }
                : undefined,
          },
        ],
      },
    }),
    [takenReasons]
  );

  const { form } = useForm<PauseReasonFormData>({
    defaultValue: { reason: reason ?? '' },
    options: { stripEmptyFields: false },
    schema,
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    onChange({ isValid, submit });
  }, [onChange, isValid, submit]);

  return (
    <Form form={form} data-test-subj="case-pause-reason-form">
      <UseField
        path="reason"
        component={TextField}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'case-pause-reason-input',
            fullWidth: true,
            autoFocus: true,
            isLoading: isSubmitting,
          },
        }}
      />
    </Form>
  );
};

PauseReasonFormComponent.displayName = 'PauseReasonForm';

export const PauseReasonForm = React.memo(PauseReasonFormComponent);
