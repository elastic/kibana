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
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import { useDebouncedValue } from '@kbn/react-hooks';
import React, { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StreamsESQLEditor, validatePrefix } from '../../../esql_query_editor';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { SeveritySelector } from '../common/severity_selector';
import { validateTitle, validateEsqlQuery } from '../common/validate_query';
import { getValidPrefixes } from '../common/get_valid_prefixes';

interface ManualFlowFormProps {
  definition: Streams.all.Definition;
  query: StreamQuery;
  isSubmitting: boolean;
  setQuery: (query: StreamQuery) => void;
  setCanSave: (canSave: boolean) => void;
}

const DEBOUNCE_DELAY_MS = 500;

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
}: ManualFlowFormProps) {
  const validPrefixes = useMemo(
    () => getValidPrefixes(definition, query.esql.query),
    [definition, query.esql.query]
  );
  const queryFrom = validPrefixes[0];
  const defaultEsql = query.esql.query || queryFrom;

  const {
    control,
    watch,
    formState: { isDirty, isValid },
  } = useForm<Pick<StreamQuery, 'esql' | 'title' | 'severity_score'>>({
    defaultValues: {
      esql: { query: defaultEsql },
      title: query.title,
      severity_score: query.severity_score,
    },
    mode: 'onChange',
  });

  const { esql } = watch();

  useEffect(() => {
    const { unsubscribe } = watch((values) => setQuery({ ...query, ...values } as StreamQuery));
    return () => unsubscribe();
  }, [query, setQuery, watch]);

  useEffect(() => {
    setCanSave(isValid && isDirty);
  }, [isValid, isDirty, setCanSave]);

  const debouncedEsqlQuery = useDebouncedValue(esql.query, DEBOUNCE_DELAY_MS);

  const isPreviewQueryValid = useMemo(() => {
    const syntaxCheck = validateEsqlQuery(debouncedEsqlQuery);
    if (syntaxCheck.isInvalid) return false;
    const prefixCheck = validatePrefix(debouncedEsqlQuery, validPrefixes);
    return prefixCheck.isValid;
  }, [debouncedEsqlQuery, validPrefixes]);

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
                    onChange={(e) => field.onChange(e.target.value)}
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
            name="severity_score"
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
                  onChange={(score) => field.onChange(score)}
                />
              </EuiFormRow>
            )}
          />

          <Controller
            name="esql.query"
            control={control}
            rules={{
              required: true,
              validate: (value) => {
                const syntaxError = validateEsqlQuery(value);
                if (syntaxError.isInvalid) {
                  return syntaxError.error;
                }
                const prefixError = validatePrefix(value, validPrefixes);
                if (!prefixError.isValid) {
                  return prefixError.error.message;
                }
                return true;
              },
            }}
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
                <StreamsESQLEditor
                  query={{ esql: field.value }}
                  isDisabled={isSubmitting}
                  onTextLangQuerySubmit={async (newQuery) => {
                    if (newQuery) field.onChange(newQuery.esql);
                  }}
                  onTextLangQueryChange={(newQuery) => field.onChange(newQuery.esql)}
                  prefix={validPrefixes}
                />
              </EuiFormRow>
            )}
          />
        </EuiForm>

        <PreviewDataSparkPlot
          definition={definition}
          query={{ ...query, esql: { query: debouncedEsqlQuery } }}
          isQueryValid={isPreviewQueryValid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
