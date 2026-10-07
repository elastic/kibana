/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useController, useFormContext, useFormState, useWatch } from 'react-hook-form';

import type { CreateDatasetFormValues } from '../create_dataset_form_state';
import { InferSchemaToggle } from './infer_schema_toggle';
import { MappingHeader } from './mapping_header';
import { TimeseriesDataSection } from './timeseries_data_section';
import type { DataFederationKibanaServices } from '../../types';
import { MappingEditor, type MappingEditorValue } from './mapping_editor';
import { createDatasetWizardStrings } from '../create_dataset_wizard_i18n';
import { TIMESTAMP_FIELD_ID, TIMESTAMP_LOGICAL_FIELD_NAME } from '../constants';
import { useWizardStep } from '../wizard_step_context';
import { isDefineSchemaValid, isTimestampField, isTimestampFieldValid } from '../step_validity';

export function StepMapping() {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();
  const { control, getFieldState, trigger } = useFormContext<CreateDatasetFormValues>();
  const updateContent = useWizardStep();
  const { field } = useController({ name: 'mappings', control });
  const schemaResolutionFormState = useFormState({ control, name: 'settings.schema_resolution' });
  const isSchemaResolutionInvalid = getFieldState(
    'settings.schema_resolution',
    schemaResolutionFormState
  ).invalid;
  const schemaResolutionIsValid = useWatch({ control, name: 'ui.schemaResolutionIsValid' });
  const [hasAttemptedValidation, setHasAttemptedValidation] = useState(false);

  const setMappings = useCallback(
    (next: SetStateAction<MappingEditorValue>) => {
      const resolved =
        typeof next === 'function'
          ? (next as (prev: MappingEditorValue) => MappingEditorValue)(field.value)
          : next;
      field.onChange(resolved);
    },
    [field]
  );

  const splitFields = useMemo(() => {
    const allFields = field.value.fields ?? [];
    const timestampField = allFields.find(isTimestampField);
    const otherFields = allFields.filter((f) => !isTimestampField(f));
    return { timestampField, otherFields };
  }, [field.value.fields]);

  const isTimeseriesEnabled = Boolean(splitFields.timestampField);
  const dynamicMode = field.value.dynamic;
  const isSchemaDefined = isDefineSchemaValid(field.value);
  const isMappingStepValid = isTimestampFieldValid(field.value) && isSchemaDefined;
  const mappingStepErrors = useMemo(() => {
    const errors: Array<{ testSubj: string; message: string }> = [];
    if (hasAttemptedValidation && !isSchemaDefined) {
      errors.push({
        testSubj: 'createDatasetWizardDefineSchemaRequiresField',
        message: createDatasetWizardStrings.defineSchemaRequiresFieldError,
      });
    }
    return errors;
  }, [isSchemaDefined, hasAttemptedValidation]);

  const onTimeseriesToggle = useCallback(
    (checked: boolean) => {
      setMappings((prev) => {
        const otherFields = prev.fields.filter((f) => !isTimestampField(f));
        if (!checked) return { ...prev, fields: otherFields };

        const existing = prev.fields.find(isTimestampField);
        const timestampField = existing ?? {
          id: TIMESTAMP_FIELD_ID,
          name: TIMESTAMP_LOGICAL_FIELD_NAME,
          path: '',
          type: 'date' as const,
          format: '',
        };

        return { ...prev, fields: [timestampField, ...otherFields] };
      });
    },
    [setMappings]
  );

  const updateTimestampField = useCallback(
    (patch: Partial<MappingEditorValue['fields'][number]>) => {
      setMappings((prev) => {
        const otherFields = prev.fields.filter((f) => !isTimestampField(f));
        const existing = prev.fields.find(isTimestampField);
        if (!existing) return prev;

        const nextTimestamp = {
          ...existing,
          ...patch,
          id: TIMESTAMP_FIELD_ID,
          name: TIMESTAMP_LOGICAL_FIELD_NAME,
        };

        return { ...prev, fields: [nextTimestamp, ...otherFields] };
      });
    },
    [setMappings]
  );

  const onDynamicModeChange = useCallback(
    (nextDynamic: boolean) => {
      setMappings((prev) => ({ ...prev, dynamic: nextDynamic }));
    },
    [setMappings]
  );

  const onEditorChange = useCallback(
    (next: SetStateAction<MappingEditorValue>) => {
      setMappings((prev) => {
        const otherFields = prev.fields.filter((f) => !isTimestampField(f));
        let timestamp = prev.fields.find(isTimestampField);

        const resolved =
          typeof next === 'function'
            ? (next as (p: MappingEditorValue) => MappingEditorValue)({
                ...prev,
                fields: otherFields,
              })
            : next;

        // If timeseries is currently disabled, allow users to add `@timestamp`
        // via the mapping editor and automatically enable timeseries.
        if (!timestamp) {
          const timestampIndex = resolved.fields.findIndex(
            (f) => f.name.trim() === TIMESTAMP_LOGICAL_FIELD_NAME
          );
          if (timestampIndex >= 0) {
            const candidate = resolved.fields[timestampIndex];
            const candidatePath = candidate.path.trim();
            const candidateFormat = candidate.format.trim();
            const nextType =
              candidate.type === 'date_nanos' ? ('date_nanos' as const) : ('date' as const);

            timestamp = {
              id: TIMESTAMP_FIELD_ID,
              name: TIMESTAMP_LOGICAL_FIELD_NAME,
              // In the mapping editor, `path` is "Original field name (optional)".
              // In the timeseries section, `path` is the source column / JSON path.
              path: candidatePath || candidate.name.trim(),
              type: nextType,
              format: candidateFormat,
            };

            resolved.fields = resolved.fields.filter((_, idx) => idx !== timestampIndex);
          }
        }

        return {
          ...prev,
          fields: [...(timestamp ? [timestamp] : []), ...resolved.fields],
        };
      });
    },
    [setMappings]
  );

  useEffect(() => {
    updateContent({
      // Always report a boolean so other steps can still validate/navigate.
      // We keep the "don't show errors until Next is pressed" behavior separate.
      isValid: hasAttemptedValidation ? isMappingStepValid && !isSchemaResolutionInvalid : true,
      validate: async () => {
        setHasAttemptedValidation(true);
        const isSchemaResolutionValid = await trigger('settings.schema_resolution');
        return isMappingStepValid && isSchemaResolutionValid;
      },
    });
  }, [
    hasAttemptedValidation,
    isMappingStepValid,
    isSchemaResolutionInvalid,
    trigger,
    updateContent,
  ]);

  useEffect(() => {
    // The schema resolution rule depends on its validity flag and the infer schema mode, neither of
    // which re-validates on its own because the form never submits.
    if (!hasAttemptedValidation) return;
    trigger('settings.schema_resolution');
  }, [schemaResolutionIsValid, dynamicMode, hasAttemptedValidation, trigger]);

  return (
    <div data-test-subj="createDatasetWizardMappingStep">
      <MappingHeader docLinks={docLinks} />

      <div data-test-subj="createDatasetWizardMappedFields">
        <EuiSpacer size="m" />
        <TimeseriesDataSection
          isEnabled={isTimeseriesEnabled}
          shouldShowValidation={hasAttemptedValidation}
          timestampField={splitFields.timestampField}
          onToggle={onTimeseriesToggle}
          onChangeTimestampField={updateTimestampField}
        />

        <EuiSpacer size="m" />
        <InferSchemaToggle dynamicMode={dynamicMode} onDynamicModeChange={onDynamicModeChange} />

        <EuiSpacer size="m" />
        <MappingEditor
          value={{ ...field.value, fields: splitFields.otherFields }}
          onChange={onEditorChange}
          reservedFieldNames={isTimeseriesEnabled ? [TIMESTAMP_LOGICAL_FIELD_NAME] : undefined}
        />
        {mappingStepErrors.length > 0 ? (
          <>
            <EuiSpacer size="l" />
            <KbnDangerCallout
              title={createDatasetWizardStrings.mappingStepErrorsTitle}
              data-test-subj="createDatasetWizardMappingStepErrors"
              text={
                <ul>
                  {mappingStepErrors.map((e) => (
                    <li key={e.testSubj} data-test-subj={e.testSubj}>
                      {e.message}
                    </li>
                  ))}
                </ul>
              }
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
