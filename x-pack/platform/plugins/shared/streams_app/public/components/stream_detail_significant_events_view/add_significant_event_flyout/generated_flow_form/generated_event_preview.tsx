/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamQueryKql, Streams, System } from '@kbn/streams-schema';
import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldText,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiSuperSelect,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { DataView } from '@kbn/data-views-plugin/public';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import type { validateQuery } from '../common/validate_query';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { NO_SYSTEM } from '../utils/default_query';

interface GeneratedEventPreviewProps {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  validation: ReturnType<typeof validateQuery>;
  onSave: (query: StreamQueryKql) => void;
  isGenerating: boolean;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
}

export function GeneratedEventPreview({
  definition,
  query: initialQuery,
  validation,
  isGenerating,
  systems,
  dataViews,
}: GeneratedEventPreviewProps) {
  const { euiTheme } = useEuiTheme();
  const [isEditing, setIsEditing] = useState(false);

  const [query, setQuery] = useState<StreamQueryKql>(initialQuery);

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
    <div
      css={{ width: '100%', padding: `${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m} 0` }}
    >
      <EuiForm fullWidth>
        <EuiFormRow
          className={css`
            & .euiFormLabel {
              margin: auto 0;
            }
          `}
          label={
            <EuiFormLabel>
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldTitleLabel',
                { defaultMessage: 'Title' }
              )}
            </EuiFormLabel>
          }
          labelAppend={
            <EuiButton
              size="s"
              onClick={() => {
                setIsEditing(true);
              }}
            >
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.editButtonLabel',
                { defaultMessage: 'Edit' }
              )}
            </EuiButton>
          }
        >
          <>
            <EuiSpacer size="s" />
            <EuiFieldText
              compressed
              value={query?.title}
              disabled={!isEditing}
              onChange={(event) => {
                setQuery({ ...query, title: event.currentTarget.value });
              }}
            />
          </>
        </EuiFormRow>

        <EuiFormRow
          label={
            <EuiFormLabel>
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldSystemLabel',
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
            onChange={(value) => {
              setQuery({
                ...query,
                system: value,
              });
            }}
            placeholder={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generatedEventPreview.systemPlaceholder',
              { defaultMessage: 'Select system' }
            )}
            disabled={!isEditing}
            fullWidth
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <EuiFormLabel>
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldQueryLabel',
                { defaultMessage: 'Query' }
              )}
            </EuiFormLabel>
          }
        >
          <UncontrolledStreamsAppSearchBar
            query={
              query.kql ? { language: 'kuery', ...query.kql } : { language: 'kuery', query: '' }
            }
            onQuerySubmit={(next) => {
              setQuery({
                ...query,
                kql: {
                  query: typeof next.query?.query === 'string' ? next.query.query : '',
                },
              });
            }}
            showQueryInput
            showSubmitButton={false}
            isDisabled={!isEditing}
            placeholder={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generatedEventPreview.queryPlaceholder',
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
    </div>
  );
}
