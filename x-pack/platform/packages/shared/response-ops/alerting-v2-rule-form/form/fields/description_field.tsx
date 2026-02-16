/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiTextArea, EuiButtonEmpty, EuiSpacer } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import type { FormValues } from '../types';

const DESCRIPTION_ROW_ID = 'ruleV2FormDescriptionField';

export const DescriptionField: React.FC = () => {
  const { control, watch } = useFormContext<FormValues>();
  const descriptionValue = watch('metadata.description');

  // Show the input if there's already a description value
  const [isInputVisible, setIsInputVisible] = useState(() => Boolean(descriptionValue));

  // Update visibility if description value changes externally (e.g., form reset)
  useEffect(() => {
    if (descriptionValue && !isInputVisible) {
      setIsInputVisible(true);
    }
  }, [descriptionValue, isInputVisible]);

  const handleAddDescription = useCallback(() => {
    setIsInputVisible(true);
  }, []);

  if (!isInputVisible) {
    return (
      <>
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          iconType="plusInCircle"
          onClick={handleAddDescription}
          size="xs"
          data-test-subj="addDescriptionButton"
          color="text"
        >
          {i18n.translate('xpack.alertingV2.ruleForm.addDescriptionButton', {
            defaultMessage: 'Add description',
          })}
        </EuiButtonEmpty>
        <EuiSpacer size="s" />
      </>
    );
  }

  return (
    <Controller
      name="metadata.description"
      control={control}
      render={({ field: { ref, ...field }, fieldState: { error } }) => (
        <EuiFormRow
          id={DESCRIPTION_ROW_ID}
          label={i18n.translate('xpack.alertingV2.ruleForm.descriptionLabel', {
            defaultMessage: 'Description',
          })}
          isInvalid={!!error}
          error={error?.message}
        >
          <EuiTextArea
            {...field}
            inputRef={ref}
            rows={2}
            isInvalid={!!error}
            placeholder={i18n.translate('xpack.alertingV2.ruleForm.descriptionPlaceholder', {
              defaultMessage: 'Add an optional description for this rule...',
            })}
            data-test-subj="ruleDescriptionInput"
          />
        </EuiFormRow>
      )}
    />
  );
};
