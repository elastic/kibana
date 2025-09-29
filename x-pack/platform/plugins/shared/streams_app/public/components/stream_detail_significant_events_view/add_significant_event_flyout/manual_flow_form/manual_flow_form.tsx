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
import type { DataView } from '@kbn/data-views-plugin/public';
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { NO_SYSTEM } from '../utils/default_query';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  isSubmitting: boolean;
  setQuery: (query: StreamQueryKql) => void;
  setCanSave: (canSave: boolean) => void;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
}

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
  systems,
  dataViews,
}: Props) {
  const [touched, setTouched] = useState({ title: false, system: false, kql: false });

  const validation = validateQuery(query);

  useEffect(() => {
    const isValid = !validation.title.isInvalid && !validation.kql.isInvalid;
    const isTouched = touched.title || touched.kql || touched.system;
    setCanSave(isValid && isTouched);
  }, [validation, setCanSave, touched]);

  const options = systems
    .map((system) => ({
      value: system,
      inputDisplay: system.name,
    }))
    .concat([
      {
        value: NO_SYSTEM,
        inputDisplay: i18n.translate(
          'xpack.streams.addSignificantEventFlyout.manualFlow.noSystemOptionLabel',
          { defaultMessage: 'No system' }
        ),
      },
    ]);

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
                  'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldSystemLabel',
                  { defaultMessage: 'System' }
                )}
              </EuiFormLabel>
            }
          >
            <EuiSuperSelect
              options={options}
              valueOfSelected={
                options.find((option) => option.value.name === query.system?.name)?.value
              }
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.systemPlaceholder',
                { defaultMessage: 'Select system' }
              )}
              disabled={isSubmitting || systems.length === 0}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, system: true }));
              }}
              onChange={(value) => {
                setQuery({
                  ...query,
                  system: value,
                });
                setTouched((prev) => ({ ...prev, system: true }));
              }}
              fullWidth
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
              }}
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.queryPlaceholder',
                { defaultMessage: 'Enter query' }
              )}
              indexPatterns={dataViews}
              submitOnBlur
            />
          </EuiFormRow>
        </EuiForm>

        <EuiHorizontalRule margin="m" />

        <PreviewDataSparkPlot
          definition={definition}
          query={query}
          isQueryValid={!validation.kql.isInvalid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
