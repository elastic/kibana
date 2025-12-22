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
import type { StreamQueryKql, Streams, Feature } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { SeveritySelector } from '../common/severity_selector';
import { ALL_DATA_OPTION } from '../../feature_selector';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  isSubmitting: boolean;
  setQuery: (query: StreamQueryKql) => void;
  setCanSave: (canSave: boolean) => void;
  features: Feature[];
  dataViews: DataView[];
}

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
  features,
  dataViews,
}: Props) {
  const [touched, setTouched] = useState({
    title: false,
    feature: false,
    kql: false,
    severity: false,
  });

  const validation = validateQuery(query);

  useEffect(() => {
    const isValid = !validation.title.isInvalid && !validation.kql.isInvalid;
    const isTouched = touched.title || touched.kql || touched.feature || touched.severity;
    setCanSave(isValid && isTouched);
  }, [validation, setCanSave, touched]);

  const options = [
    { value: ALL_DATA_OPTION.value, inputDisplay: ALL_DATA_OPTION.label },
    ...features.map((feature) => ({
      value: feature,
      inputDisplay: feature.name,
    })),
  ];

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
                  'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldFeatureLabel',
                  { defaultMessage: 'Feature' }
                )}
              </EuiFormLabel>
            }
          >
            <EuiSuperSelect
              options={options}
              valueOfSelected={
                query.feature
                  ? options.find(
                      (option) =>
                        option.value.name === query.feature?.name &&
                        option.value.type === query.feature?.type
                    )?.value
                  : ALL_DATA_OPTION.value
              }
              placeholder={i18n.translate(
                'xpack.streams.addSignificantEventFlyout.manualFlow.featurePlaceholder',
                { defaultMessage: 'Select feature' }
              )}
              disabled={isSubmitting || features.length === 0}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, feature: true }));
              }}
              onChange={(value) => {
                const feature =
                  value.type === ALL_DATA_OPTION.value.type
                    ? undefined
                    : {
                        name: value.name,
                        filter: value.filter,
                        type: value.type,
                      };
                setQuery({ ...query, feature });
                setTouched((prev) => ({ ...prev, feature: true }));
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
