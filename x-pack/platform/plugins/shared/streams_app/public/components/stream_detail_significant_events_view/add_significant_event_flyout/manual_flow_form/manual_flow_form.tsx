/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSuperSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams, System } from '@kbn/streams-schema';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useDebounceFn } from '@kbn/react-hooks';
import { EsqlQueryEditor } from '../../../esql_query_editor';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { SeveritySelector } from '../common/severity_selector';
import { validateTitle, validateEsqlQuery } from '../common/validate_query';
import { ALL_DATA_OPTION } from '../../system_selector';

interface ManualFlowFormProps {
  definition: Streams.all.Definition;
  query: StreamQuery;
  isSubmitting: boolean;
  isEditMode: boolean;
  setQuery: (query: StreamQuery) => void;
  setCanSave: (canSave: boolean) => void;
  systems: System[];
}

interface FormValues {
  title: string;
  esqlQuery: string;
  severityScore?: number;
  feature?: StreamQuery['feature'];
}

const DEBOUNCE_DELAY_MS = 300;
const DEBOUNCE_OPTIONS = { wait: DEBOUNCE_DELAY_MS };

const getDefaultQueryPrefix = (definition: Streams.all.Definition) => `FROM ${definition.name}`;

function enforceFromPrefix(value: string, definition: Streams.all.Definition): string {
  const fromPrefix = getDefaultQueryPrefix(definition);
  let esqlQuery = value.trim();

  if (!esqlQuery.startsWith(fromPrefix)) {
    esqlQuery = esqlQuery.replace(/^FROM\s+\S+/i, '').trim();
  }

  return [fromPrefix, esqlQuery].filter(Boolean).join(' ').trim();
}

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
  isEditMode,
  systems,
}: ManualFlowFormProps) {
  const defaultEsql = query.esql?.query || getDefaultQueryPrefix(definition);

  const {
    control,
    formState: { isDirty, isValid },
  } = useForm<FormValues>({
    defaultValues: {
      title: query.title ?? '',
      esqlQuery: defaultEsql,
      severityScore: query.severity_score,
      feature: query.feature,
    },
    mode: 'onChange',
  });

  useEffect(() => {
    setCanSave(isValid && isDirty);
  }, [isValid, isDirty, setCanSave]);

  const [debouncedEsql, setDebouncedEsql] = useState(defaultEsql);
  const { run: updateDebouncedEsql } = useDebounceFn(
    (text: string) => setDebouncedEsql(text),
    DEBOUNCE_OPTIONS
  );

  const debouncedQuery = useMemo(
    (): StreamQuery => ({ ...query, esql: { query: debouncedEsql } }),
    [query, debouncedEsql]
  );

  const systemOptions = [
    { value: ALL_DATA_OPTION.value, inputDisplay: ALL_DATA_OPTION.label },
    ...systems.map((system) => ({ value: system, inputDisplay: system.name })),
  ];

  return (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiForm fullWidth>
          <Controller
            name="title"
            control={control}
            rules={{ validate: (v) => validateTitle(v).error ?? true }}
            render={({ field, fieldState }) => {
              const isInvalid = fieldState.isTouched && !!fieldState.error;
              return (
                <EuiFormRow
                  isInvalid={isInvalid}
                  error={fieldState.error?.message}
                  label={
                    <EuiFormLabel>
                      {i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldTitleLabel',
                        { defaultMessage: 'Title' }
                      )}
                    </EuiFormLabel>
                  }
                >
                  <EuiFieldText
                    isInvalid={isInvalid}
                    value={field.value}
                    disabled={isSubmitting}
                    onBlur={field.onBlur}
                    onChange={(e) => {
                      const next = e.currentTarget.value;
                      field.onChange(next);
                      setQuery({ ...query, title: next });
                    }}
                    placeholder={i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.manualFlow.titlePlaceholder',
                      { defaultMessage: 'Add title' }
                    )}
                  />
                </EuiFormRow>
              );
            }}
          />

          <Controller
            name="severityScore"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={
                  <EuiFormLabel>
                    {i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldSeverityLabel',
                      { defaultMessage: 'Severity' }
                    )}
                  </EuiFormLabel>
                }
              >
                <SeveritySelector
                  severityScore={field.value}
                  onChange={(score) => {
                    field.onChange(score);
                    setQuery({ ...query, severity_score: score });
                  }}
                />
              </EuiFormRow>
            )}
          />

          <Controller
            name="feature"
            control={control}
            render={({ field }) => (
              <EuiFormRow
                label={
                  <EuiFormLabel>
                    {i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldSystemLabel',
                      { defaultMessage: 'System' }
                    )}
                  </EuiFormLabel>
                }
              >
                <EuiSuperSelect
                  options={systemOptions}
                  valueOfSelected={
                    field.value
                      ? systemOptions.find(
                          (opt) =>
                            opt.value.name === field.value?.name &&
                            opt.value.type === field.value?.type
                        )?.value
                      : ALL_DATA_OPTION.value
                  }
                  placeholder={i18n.translate(
                    'xpack.streams.addSignificantEventFlyout.manualFlow.systemPlaceholder',
                    { defaultMessage: 'Select system' }
                  )}
                  disabled={isSubmitting || systems.length === 0 || isEditMode}
                  onBlur={field.onBlur}
                  onChange={(value) => {
                    const feature =
                      value.type === ALL_DATA_OPTION.value.type
                        ? undefined
                        : { name: value.name, filter: value.filter, type: value.type };
                    field.onChange(feature);
                    setQuery({ ...query, feature });
                  }}
                  fullWidth
                />
              </EuiFormRow>
            )}
          />

          <Controller
            name="esqlQuery"
            control={control}
            rules={{ validate: (v) => validateEsqlQuery(v).error ?? true }}
            render={({ field, fieldState }) => (
              <EuiFormRow
                isInvalid={fieldState.isTouched && !!fieldState.error}
                error={fieldState.error?.message}
                label={
                  <EuiFormLabel>
                    {i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldQueryLabel',
                      { defaultMessage: 'Query' }
                    )}
                  </EuiFormLabel>
                }
              >
                <EsqlQueryEditor
                  value={field.value}
                  isDisabled={isSubmitting}
                  onChange={(value) => {
                    const esql = enforceFromPrefix(value, definition);
                    field.onChange(esql);
                    setQuery({ ...query, esql: { query: esql } });
                    updateDebouncedEsql(esql);
                  }}
                />
              </EuiFormRow>
            )}
          />
        </EuiForm>

        <EuiHorizontalRule margin="m" />

        <PreviewDataSparkPlot
          definition={definition}
          query={debouncedQuery}
          isQueryValid={isValid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
