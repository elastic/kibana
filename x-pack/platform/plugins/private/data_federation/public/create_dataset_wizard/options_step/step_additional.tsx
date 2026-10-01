/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { useFormContext, useFormState, useWatch, type FieldPath } from 'react-hook-form';
import { useKibana } from '@kbn/kibana-react-plugin/public';

import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { CreateDatasetAdditionalSettings } from './create_dataset_settings';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { useWizardStep } from '../wizard_step_context';
import type { DataFederationKibanaServices } from '../../types';

const ADDITIONAL_STEP_FIELDS: Array<FieldPath<CreateDatasetFormValues>> = [
  'settings.partition_detection',
  'settings.partition_path',
  'settings.error_mode',
  'settings.max_errors',
  'settings.max_error_ratio',
  'settings.skip_rows',
  'settings.mode',
  'settings.header_row',
  'settings.trim_spaces',
  'settings.delimiter',
  'settings.quote',
  'settings.escape',
];

const COMBO_BOX_VALIDITY_FIELDS = [
  'ui.modeIsValid',
  'ui.headerRowIsValid',
  'ui.trimSpacesIsValid',
  'ui.partitionDetectionIsValid',
  'ui.errorModeIsValid',
] as const;

export function StepAdditional() {
  const { control, getFieldState, trigger } = useFormContext<CreateDatasetFormValues>();
  const formState = useFormState({ control, name: ADDITIONAL_STEP_FIELDS });
  const hasFieldErrors = ADDITIONAL_STEP_FIELDS.some(
    (field) => getFieldState(field, formState).invalid
  );
  const settings = useWatch({ control, name: 'settings' });
  const comboBoxValidity = useWatch({ control, name: COMBO_BOX_VALIDITY_FIELDS }).join();
  const updateContent = useWizardStep();
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();

  useEffect(() => {
    // Don't mark the step invalid (disabling Next) until the user tries to proceed.
    updateContent({
      isValid: !hasAttemptedValidation || !hasFieldErrors,
      validate: async () => {
        setHasAttemptedValidation(true);
        return trigger(ADDITIONAL_STEP_FIELDS);
      },
    });
  }, [hasAttemptedValidation, hasFieldErrors, trigger, updateContent]);

  useEffect(() => {
    // The form uses react-hook-form's default `onSubmit` mode, and the wizard never submits it,
    // so errors shown after a Next attempt would otherwise not clear until Next is clicked again.
    // Any settings change is watched because some rules depend on other settings (e.g. CSV mode).
    // The combo box validity flags are watched because unresolved typed text fails their rules.
    if (!hasAttemptedValidation) return;
    trigger(ADDITIONAL_STEP_FIELDS);
  }, [settings, comboBoxValidity, hasAttemptedValidation, trigger]);

  return (
    <div data-test-subj="createDatasetWizardAdditionalStep">
      <EuiTitle size="m">
        <h2>{createDatasetWizardStrings.additionalStepLabel}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          {createDatasetWizardStrings.additionalStepSubheader}{' '}
          <EuiLink
            href={docLinks.links.dataFederation.datasetSettings}
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj="createDatasetWizardOptionalSettingsLearnMore"
          >
            {createDatasetWizardStrings.learnMore}
          </EuiLink>
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <div style={{ width: '100%', maxWidth: 600 }}>
        <CreateDatasetAdditionalSettings control={control} />
      </div>
    </div>
  );
}
