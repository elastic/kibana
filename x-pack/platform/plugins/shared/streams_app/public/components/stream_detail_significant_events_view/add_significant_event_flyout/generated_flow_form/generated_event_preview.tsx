/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StreamQuery, Streams } from '@kbn/streams-schema';
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
  EuiTextArea,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { PreviewDataSparkPlot } from '../common/preview_data_spark_plot';
import { validateQuery } from '../common/validate_query';
import { SeveritySelector } from '../common/severity_selector';

interface GeneratedEventPreviewProps {
  definition: Streams.all.Definition;
  query: StreamQuery;
  onSave: (query: StreamQuery) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
}

export function GeneratedEventPreview({
  definition,
  query: initialQuery,
  isEditing,
  setIsEditing,
  onSave,
}: GeneratedEventPreviewProps) {
  const { euiTheme } = useEuiTheme();

  const [query, setQuery] = useState<StreamQuery>(initialQuery);

  const [touched, setTouched] = useState({ title: false, esqlWhere: false });
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
                          esqlWhere: false,
                        });
                      }}
                      data-test-subj="significant_events_generated_event_cancel_button"
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
                      disabled={validation.title.isInvalid || validation.esqlWhere.isInvalid}
                      onClick={() => {
                        setIsEditing(false);
                        onSave(query);
                        setTouched({
                          title: false,
                          esqlWhere: false,
                        });
                      }}
                      data-test-subj="significant_events_generated_event_save_button"
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
                data-test-subj="significant_events_generated_event_edit_button"
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
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldSeverityLabel',
                { defaultMessage: 'Severity' }
              )}
            </EuiFormLabel>
          }
        >
          <SeveritySelector
            disabled={!isEditing}
            severityScore={query.severity_score}
            onChange={(score) => {
              setQuery({ ...query, severity_score: score });
            }}
          />
        </EuiFormRow>

        <EuiFormRow
          label={
            <EuiFormLabel>
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.generatedEventPreview.formFieldQueryLabel',
                { defaultMessage: 'Query (ES|QL WHERE condition)' }
              )}
            </EuiFormLabel>
          }
          {...(touched.esqlWhere && { ...validation.esqlWhere })}
        >
          <EuiTextArea
            value={query.esql.where}
            disabled={!isEditing}
            rows={2}
            compressed
            onBlur={() => {
              setTouched((prev) => ({ ...prev, esqlWhere: true }));
            }}
            onChange={(event) => {
              const nextEsqlWhere = event.currentTarget.value;
              setQuery({
                ...query,
                esql: { where: nextEsqlWhere },
              });
              setTouched((prev) => ({ ...prev, esqlWhere: true }));
            }}
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
        isQueryValid={!validation.esqlWhere.isInvalid}
      />
    </div>
  );
}
