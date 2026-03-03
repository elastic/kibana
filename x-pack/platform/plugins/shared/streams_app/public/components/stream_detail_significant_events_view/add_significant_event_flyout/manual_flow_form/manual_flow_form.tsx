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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { StreamQuery, Streams } from '@kbn/streams-schema';
import React, { useEffect, useMemo, useState } from 'react';
import { useDebounceFn } from '@kbn/react-hooks';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { SeveritySelector } from '../common/severity_selector';
import { ConditionPanel } from '../../../data_management/shared/condition_display';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQuery;
  isSubmitting: boolean;
  isEditMode: boolean;
  setQuery: (query: StreamQuery) => void;
  setCanSave: (canSave: boolean) => void;
  dataViews: DataView[];
}

const DEBOUNCE_DELAY_MS = 300;
const DEBOUNCE_OPTIONS = { wait: DEBOUNCE_DELAY_MS };

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
  isEditMode,
  dataViews,
}: Props) {
  const [touched, setTouched] = useState({
    title: false,
    kql: false,
    severity: false,
  });

  // Debounced KQL query for preview chart API calls
  const [debouncedKqlQuery, setDebouncedKqlQuery] = useState(query.kql.query);

  const { run: updateDebouncedKqlQuery } = useDebounceFn(
    (kqlQuery: string) => setDebouncedKqlQuery(kqlQuery),
    DEBOUNCE_OPTIONS
  );

  // Create a query object with debounced KQL for the preview chart
  const debouncedQuery = useMemo(
    (): StreamQuery => ({
      ...query,
      kql: { query: debouncedKqlQuery },
    }),
    [query, debouncedKqlQuery]
  );

  const validation = validateQuery(query);

  useEffect(() => {
    const isValid = !validation.title.isInvalid && !validation.kql.isInvalid;
    const isTouched = touched.title || touched.kql || touched.severity;
    setCanSave(isValid && isTouched);
  }, [validation, setCanSave, touched]);

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
              onBlur={() => {
                setTouched((prev) => ({ ...prev, title: true }));
              }}
              onChange={(event) => {
                const next = event.currentTarget.value;
                setQuery({ ...query, title: next });
                setTouched((prev) => ({ ...prev, title: true }));
              }}
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
              onChange={(score) => {
                setQuery({ ...query, severity_score: score });
                setTouched((prev) => ({ ...prev, severity: true }));
              }}
            />
          </EuiFormRow>

          <EuiFormRow
            label={
              <EuiFormLabel>
                {i18n.translate(
                  'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldQueryLabel',
                  { defaultMessage: 'Query' }
                )}
              </EuiFormLabel>
            }
            {...(touched.kql && { ...validation.kql })}
          >
            <UncontrolledStreamsAppSearchBar
              query={
                query.kql ? { language: 'kuery', ...query.kql } : { language: 'kuery', query: '' }
              }
              showQueryInput
              showSubmitButton={false}
              isDisabled={isSubmitting}
              onQueryChange={(next) => {
                // Immediately sync query state so it's always up-to-date for save
                const nextKqlQuery = typeof next.query?.query === 'string' ? next.query.query : '';
                setQuery({
                  ...query,
                  kql: { query: nextKqlQuery },
                });
                // Debounce the preview chart update
                updateDebouncedKqlQuery(nextKqlQuery);
                setTouched((prev) => ({ ...prev, kql: true }));
              }}
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.queryPlaceholder',
                { defaultMessage: 'Enter query' }
              )}
              indexPatterns={dataViews}
            />
          </EuiFormRow>

          {query.feature?.filter && (
            <EuiFormRow
              label={
                <EuiFormLabel>
                  {i18n.translate(
                    'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldAdditionalFilterLabel',
                    { defaultMessage: 'Additional filter' }
                  )}
                </EuiFormLabel>
              }
              helpText={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.additionalFilterHelpText',
                {
                  defaultMessage: 'This filter was inherited from a system and cannot be modified.',
                }
              )}
            >
              <ConditionPanel condition={query.feature.filter} />
            </EuiFormRow>
          )}
        </EuiForm>

        <EuiHorizontalRule margin="m" />

        <PreviewDataSparkPlot
          definition={definition}
          query={debouncedQuery}
          isQueryValid={!validation.kql.isInvalid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
