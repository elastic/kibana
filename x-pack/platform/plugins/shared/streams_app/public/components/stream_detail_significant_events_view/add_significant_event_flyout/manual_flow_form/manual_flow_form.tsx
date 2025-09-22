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
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';

interface Props {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  isSubmitting: boolean;
  setQuery: (query: StreamQueryKql) => void;
  setCanSave: (canSave: boolean) => void;
  systems: Omit<System, 'description'>[];
}

export function ManualFlowForm({
  definition,
  query,
  setQuery,
  setCanSave,
  isSubmitting,
  systems,
}: Props) {
  const {
    dependencies: {
      start: { data },
    },
  } = useKibana();
  const [touched, setTouched] = useState({ title: false, system: false, kql: false });

  const dataViewsFetch = useStreamsAppFetch(() => {
    return data.dataViews.create({ title: definition.name }).then((value) => {
      return [value];
    });
  }, [data.dataViews, definition.name]);

  const validation = validateQuery(query);

  useEffect(() => {
    const isValid =
      !validation.title.isInvalid && !validation.kql.isInvalid && !validation.system.isInvalid;
    const isTouched = touched.title || touched.kql || touched.system;
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
                  'xpack.streams.addSignificantEventFlyout.manualFlow.formFieldSystemLabel',
                  { defaultMessage: 'System' }
                )}
              </EuiFormLabel>
            }
            {...(touched.system && { ...validation.system })}
          >
            <EuiSuperSelect
              options={systems.map((system) => ({
                value: system,
                inputDisplay: system.name,
              }))}
              valueOfSelected={
                systems.find((system) => system.name === query.system?.name) || undefined
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
              indexPatterns={dataViewsFetch.value}
              submitOnBlur
            />
          </EuiFormRow>
        </EuiForm>

        <EuiHorizontalRule margin="m" />

        <PreviewDataSparkPlot
          definition={definition}
          query={query}
          isQueryValid={!validation.kql.isInvalid && !validation.system.isInvalid}
        />
      </EuiFlexGroup>
    </EuiPanel>
  );
}
