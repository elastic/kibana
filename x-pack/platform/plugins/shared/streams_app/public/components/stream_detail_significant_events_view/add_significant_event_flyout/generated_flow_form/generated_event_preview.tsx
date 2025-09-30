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
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
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
import { validateQuery } from '../common/validate_query';
import { UncontrolledStreamsAppSearchBar } from '../../../streams_app_search_bar/uncontrolled_streams_app_bar';
import { NO_SYSTEM } from '../utils/default_query';

interface GeneratedEventPreviewProps {
  definition: Streams.all.Definition;
  query: StreamQueryKql;
  onSave: (query: StreamQueryKql) => void;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export function GeneratedEventPreview({
  definition,
  query: initialQuery,
  isEditing,
  setIsEditing,
  onSave,
  systems,
  dataViews,
}: GeneratedEventPreviewProps) {
  const { euiTheme } = useEuiTheme();

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

  const [touched, setTouched] = useState({ title: false, system: false, kql: false });
  const validation = validateQuery(query);

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
            isEditing ? (
              <>
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  justifyContent="flexEnd"
                  responsive={false}
                >
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="s"
                      onClick={() => {
                        setIsEditing(false);
                        setQuery(initialQuery);
                        setTouched({
                          title: false,
                          system: false,
                          kql: false,
                        });
                      }}
                    >
                      {i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.generatedEventPreview.cancelButtonLabel',
                        { defaultMessage: 'Cancel' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      iconType="save"
                      disabled={validation.title.isInvalid || validation.kql.isInvalid}
                      onClick={() => {
                        setIsEditing(false);
                        onSave(query);
                        setTouched({
                          title: false,
                          system: false,
                          kql: false,
                        });
                      }}
                    >
                      {i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.generatedEventPreview.saveButtonLabel',
                        { defaultMessage: 'Save' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : (
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
            )
          }
          {...(touched.title && { ...validation.title })}
        >
          <>
            <EuiSpacer size="s" />
            <EuiFieldText
              compressed
              value={query?.title}
              disabled={!isEditing}
              onChange={(event) => {
                setQuery({ ...query, title: event.currentTarget.value });
                setTouched((prev) => ({ ...prev, title: true }));
              }}
              onBlur={() => {
                setTouched((prev) => ({ ...prev, title: true }));
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
            onBlur={() => {
              setTouched((prev) => ({ ...prev, system: true }));
            }}
            onChange={(value) => {
              setQuery({
                ...query,
                system: {
                  name: value.name,
                  filter: value.filter,
                },
              });
              setTouched((prev) => ({ ...prev, system: true }));
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
          {...(touched.kql && { ...validation.kql })}
        >
          <UncontrolledStreamsAppSearchBar
            query={
              query.kql ? { language: 'kuery', ...query.kql } : { language: 'kuery', query: '' }
            }
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
