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
  const { control, getValues } = useFormContext<CreateDatasetFormValues>();
  const { updateContent } = Forms.useContent<DatasetWizardContent, 'settings'>('settings');

  useEffect(() => {
    updateContent({
      // No required fields in this step today, but we still need a boolean
      // so wizard navigation isn't blocked by "missing content" semantics.
      isValid: true,
      validate: async () => true,
      getData: () => getValues().settings,
    });
  }, [getValues, updateContent]);

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
