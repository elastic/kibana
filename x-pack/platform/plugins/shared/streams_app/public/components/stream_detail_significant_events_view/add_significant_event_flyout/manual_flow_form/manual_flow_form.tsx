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
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  isEditMode: boolean;
  isSubmitting: boolean;
  setQuery: (query: StreamQueryKql) => void;
  setCanSave: (canSave: boolean) => void;
}

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  isEditMode,
  setCanSave,
  isSubmitting,
}: Props) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const {
    timeState: { timeRange: initialTimeRange },
  } = useTimefilter();

  const [touched, setTouched] = useState({ title: false, kql: false });
  const [timeRange, setTimeRange] = useState(initialTimeRange);

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews.create({ title: definition.name }).then((value) => {
      return [value];
    });
  }, [data.dataViews, definition.name]);

  const validation = validateQuery(query);

  useEffect(() => {
    const isValid = !validation.title.isInvalid && !validation.kql.isInvalid;
    const isTouched = touched.title || touched.kql;
    setCanSave(isValid && isTouched);
  }, [validation, setCanSave, touched.title, touched.kql]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {!isEditMode && (
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('xpack.streams.addSignificantEventFlyout.manualFlow.title', {
              defaultMessage: 'Create from a query',
            })}
          </h3>
        </EuiTitle>
      )}

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
              { defaultMessage: 'What should we call this event?' }
            )}
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
            isDisabled={isSubmitting}
            onQueryChange={() => {
              setTouched((prev) => ({ ...prev, kql: true }));
            }}
            onQuerySubmit={(next) => {
              setQuery({
                ...query,
                kql: {
                  query: typeof next.query?.query === 'string' ? next.query.query : '',
                },
              });

              setTouched((prev) => ({ ...prev, kql: true }));
              if (next.dateRange) {
                setTimeRange(next.dateRange);
              }
            }}
            dateRangeFrom={timeRange.from}
            dateRangeTo={timeRange.to}
            placeholder={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.manualFlow.queryPlaceholder',
              { defaultMessage: 'What are you looking for?' }
            )}
            indexPatterns={dataViewsFetch.value}
            submitOnBlur
          />
        </EuiFormRow>
      </EuiForm>

      <PreviewDataSparkPlot
        definition={definition}
        query={query}
        timeRange={timeRange}
        isQueryValid={!validation.kql.isInvalid}
      />
    </EuiFlexGroup>
  );
}
