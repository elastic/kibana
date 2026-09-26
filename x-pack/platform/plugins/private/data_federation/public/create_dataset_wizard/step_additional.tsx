/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { Forms } from '@kbn/es-ui-shared-plugin/public';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { CreateDatasetAdditionalSettings } from './create_dataset_settings';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import type { DatasetWizardContent } from './types';

export function StepAdditional() {
  const { control, getValues, trigger } = useFormContext<CreateDatasetFormValues>();
  const { updateContent } = Forms.useContent<DatasetWizardContent, 'settings'>('settings');

  useEffect(() => {
    updateContent({
      // isValid stays true so unset optional fields do not block the step.
      // validate enforces fields that are required only in some conditions.
      isValid: true,
      validate: async () => {
        return await trigger([
          'settings.partition_path',
          'settings.max_errors',
          'settings.max_error_ratio',
        ]);
      },
      getData: () => getValues().settings,
    });
  }, [getValues, trigger, updateContent]);

  return (
    <div data-test-subj="createDatasetWizardAdditionalStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.additionalStepLabel}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        {createDatasetWizardStrings.additionalStepSubheader}
      </EuiText>
      <EuiSpacer size="m" />
      <CreateDatasetAdditionalSettings control={control} />
    </div>
  );
}
