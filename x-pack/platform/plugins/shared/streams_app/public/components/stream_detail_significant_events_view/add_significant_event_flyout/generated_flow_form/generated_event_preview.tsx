/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React from 'react';
import {
  EuiFieldText,
  EuiForm,
  EuiFormLabel,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSuperSelect,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import type { validateQuery } from '../common/validate_query';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';

interface GeneratedEventPreviewProps {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  validation: ReturnType<typeof validateQuery>;
}

export function GeneratedEventPreview({
  definition,
  query,
  validation,
}: GeneratedEventPreviewProps) {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={{ width: '100%', padding: `${euiTheme.size.m} ${euiTheme.size.m} ${euiTheme.size.m} 0` }}
    >
      <EuiForm fullWidth>
        <EuiFormRow
          label={
            <EuiFormLabel>
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldTitleLabel',
                { defaultMessage: 'Title' }
              )}
            </EuiFormLabel>
          }
        >
          <EuiFieldText compressed value={query?.title} disabled={true} />
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
            options={[
              {
                value: query.system!,
                inputDisplay: query.system!.name,
              },
            ]}
            valueOfSelected={query.system!}
            placeholder={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generatedEventPreview.systemPlaceholder',
              { defaultMessage: 'Select system' }
            )}
            disabled={true}
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
            showQueryInput
            showSubmitButton={false}
            isDisabled={true}
            placeholder={i18n.translate(
              'xpack.streams.addSignificantEventFlyout.generatedEventPreview.queryPlaceholder',
              { defaultMessage: 'Enter query' }
            )}
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
