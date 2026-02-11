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
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { SeveritySelector } from '../common/severity_selector';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQuery;
  isSubmitting: boolean;
  isEditMode: boolean;
  setQuery: (query: StreamQuery) => void;
  setCanSave: (canSave: boolean) => void;
}

const DEBOUNCE_DELAY_MS = 300;
const DEBOUNCE_OPTIONS = { wait: DEBOUNCE_DELAY_MS };

export function ManualFlowForm({ definition, query, setQuery, setCanSave, isSubmitting }: Props) {
  const [touched, setTouched] = useState({
    title: false,
    esqlWhere: false,
    severity: false,
  });

  // Debounced ES|QL WHERE condition for preview chart API calls
  const [debouncedEsqlWhere, setDebouncedEsqlWhere] = useState(query.esql.where);

  const { run: updateDebouncedEsqlWhere } = useDebounceFn(
    (esqlWhere: string) => setDebouncedEsqlWhere(esqlWhere),
    DEBOUNCE_OPTIONS
  );

  // Create a query object with debounced esql.where for the preview chart
  // Only depend on properties actually used by PreviewDataSparkPlot
  const { id, title, severity_score: severityScore } = query;
  const debouncedQuery = useMemo(
    (): StreamQuery => ({
      id,
      title,
      severity_score: severityScore,
      esql: { where: debouncedEsqlWhere },
    }),
    [id, title, severityScore, debouncedEsqlWhere]
  );

  // Memoize validation to avoid re-parsing ES|QL on every render
  const validation = useMemo(() => validateQuery(query), [query]);
  const debouncedValidation = useMemo(() => validateQuery(debouncedQuery), [debouncedQuery]);

  useEffect(() => {
    const isValid = !validation.title.isInvalid && !validation.esqlWhere.isInvalid;
    const isTouched = touched.title || touched.esqlWhere || touched.severity;
    setCanSave(isValid && isTouched);
  }, [validation, setCanSave, touched]);

  // Memoized event handlers
  const handleTitleBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, title: true }));
  }, []);

  const handleTitleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const next = event.currentTarget.value;
      setQuery({ ...query, title: next });
      setTouched((prev) => ({ ...prev, title: true }));
    },
    [query, setQuery]
  );

  const handleSeverityChange = useCallback(
    (score: number | undefined) => {
      setQuery({ ...query, severity_score: score });
      setTouched((prev) => ({ ...prev, severity: true }));
    },
    [query, setQuery]
  );

  const handleEsqlWhereBlur = useCallback(() => {
    setTouched((prev) => ({ ...prev, esqlWhere: true }));
  }, []);

  const handleEsqlWhereChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextEsqlWhere = event.currentTarget.value;
      setQuery({
        ...query,
        esql: { where: nextEsqlWhere },
      });
      updateDebouncedEsqlWhere(nextEsqlWhere);
      setTouched((prev) => ({ ...prev, esqlWhere: true }));
    },
    [query, setQuery, updateDebouncedEsqlWhere]
  );

  return (
    <EuiPanel hasShadow={false} color="subdued">
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiForm fullWidth>
          <EuiFormRow
            {...(touched.title && { ...validation.title })}
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
              value={query?.title}
              disabled={isSubmitting}
              onBlur={handleTitleBlur}
              onChange={handleTitleChange}
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.titlePlaceholder',
                { defaultMessage: 'Add title' }
              )}
            />
          </EuiFormRow>

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
              severityScore={query.severity_score}
              onChange={handleSeverityChange}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <EuiFormLabel>
                {i18n.translate(
                  'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldQueryLabel',
                  { defaultMessage: 'Query (ES|QL WHERE condition)' }
                )}
              </EuiFormLabel>
            }
            {...(touched.esqlWhere && { ...validation.esqlWhere })}
          >
            <EuiTextArea
              value={query.esql.where}
              disabled={isSubmitting}
              rows={3}
              onBlur={handleEsqlWhereBlur}
              onChange={handleEsqlWhereChange}
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.queryPlaceholder',
                { defaultMessage: 'Enter query' }
              )}
            />
          </EuiFormRow>
        </EuiForm>

        <EuiHorizontalRule margin="m" />

        <PreviewDataSparkPlot
          definition={definition}
          query={debouncedQuery}
          isQueryValid={!debouncedValidation.esqlWhere.isInvalid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
