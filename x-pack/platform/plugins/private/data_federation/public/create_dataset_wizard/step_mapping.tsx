/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SetStateAction } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { Forms } from '@kbn/es-ui-shared-plugin/public';
import { useController, useFormContext } from 'react-hook-form';

import type { CreateDatasetFormValues } from './create_dataset_form_state';
import { createDatasetWizardStrings } from './create_dataset_wizard_i18n';
import { InferSchemaToggle } from './infer_schema_toggle';
import { MappingHeader } from './mapping_header';
import { TimeseriesDataSection } from './timeseries_data_section';
import type { DataFederationKibanaServices } from '../types';
import { MappingEditor, type MappingEditorValue } from '../components/mapping_editor';
import type { DatasetWizardContent } from './types';

const TIMESTAMP_LOGICAL_FIELD_NAME = '@timestamp';
const TIMESTAMP_FIELD_ID = '__timestamp__';

const isTimestampField = (f: MappingEditorValue['fields'][number]): boolean => {
  return f.id === TIMESTAMP_FIELD_ID || f.name.trim() === TIMESTAMP_LOGICAL_FIELD_NAME;
};

export function StepMapping() {
  const {
    services: { docLinks },
  } = useKibana<DataFederationKibanaServices>();
  const { control, getValues } = useFormContext<CreateDatasetFormValues>();
  const { updateContent } = Forms.useContent<DatasetWizardContent, 'mapping'>('mapping');
  const { field } = useController({ name: 'mappings', control });
  const [shouldShowTimeseriesValidation, setShouldShowTimeseriesValidation] = useState(false);

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
  const isTimeseriesFieldValid =
    !splitFields.timestampField || splitFields.timestampField.path.trim() !== '';

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
        const timestamp = prev.fields.find(isTimestampField);

        const resolved =
          typeof next === 'function'
            ? (next as (p: MappingEditorValue) => MappingEditorValue)({
                ...prev,
                fields: otherFields,
              })
            : next;

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
      isValid: isTimeseriesFieldValid,
      validate: async () => {
        setShouldShowTimeseriesValidation(true);
        return isTimeseriesFieldValid;
      },
      getData: () => getValues().mappings,
    });
  }, [getValues, isTimeseriesFieldValid, updateContent]);

  return (
    <div data-test-subj="createDatasetWizardMappingStep">
      <MappingHeader docLinks={docLinks} />

      <div data-test-subj="createDatasetWizardMappedFields">
        <EuiText size="s" style={{ fontWeight: 'bold' }}>
          {createDatasetWizardStrings.mappedFieldsSectionTitle}
        </EuiText>
        <EuiSpacer size="m" />

        <EuiSpacer size="m" />
        <TimeseriesDataSection
          isEnabled={isTimeseriesEnabled}
          shouldShowValidation={shouldShowTimeseriesValidation}
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
          docLinks={docLinks}
          reservedFieldNames={isTimeseriesEnabled ? ['@timestamp'] : undefined}
        />
      </div>
    </div>
  );
}
