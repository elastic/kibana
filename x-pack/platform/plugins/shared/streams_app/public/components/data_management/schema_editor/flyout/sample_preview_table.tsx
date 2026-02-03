/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useEffect, useMemo } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiIconTip } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { useKibana } from '../../../../hooks/use_kibana';
import { getFormattedError } from '../../../../util/errors';
import { useStreamsAppFetch } from '../../../../hooks/use_streams_app_fetch';
import { PreviewTable } from '../../shared/preview_table';
import { LoadingPanel } from '../../../loading_panel';
import type { MappedSchemaField, SchemaField } from '../types';
import { isSchemaFieldTyped } from '../types';
import { convertToFieldDefinitionConfig } from '../utils';

interface SamplePreviewTableProps {
  stream: Streams.ingest.all.Definition;
  nextField: SchemaField;
  onValidate?: ({
    isValid,
    isIgnored,
    isExpensiveQueries,
  }: {
    isValid: boolean;
    isIgnored: boolean;
    isExpensiveQueries: boolean;
  }) => void;
}

export const SamplePreviewTable = (props: SamplePreviewTableProps) => {
  const { nextField, ...rest } = props;
  if (isSchemaFieldTyped(nextField)) {
    return <SamplePreviewTableContent nextField={nextField} {...rest} />;
  } else {
    return null;
  }
};

const SAMPLE_DOCUMENTS_TO_SHOW = 20;

const SamplePreviewTableContent = ({
  stream,
  nextField,
  onValidate,
}: SamplePreviewTableProps & { nextField: MappedSchemaField }) => {
  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

  const { value, loading, error } = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/schema/fields_simulation',
        {
          signal,
          params: {
            path: {
              name: stream.name,
            },
            body: {
              field_definitions: [
                { ...convertToFieldDefinitionConfig(nextField), name: nextField.name },
              ],
            },
          },
        }
      );
    },
    [stream.name, nextField, streamsRepositoryClient],
    { disableToastOnError: true }
  );

  useEffect(() => {
    if (onValidate) {
      const isExpensiveQueriesError =
        error && getFormattedError(error)?.message.includes('allow_expensive_queries');

      onValidate({
        isValid: value?.status === 'failure' || error ? false : true,
        isIgnored:
          value?.documentsWithRuntimeFieldsApplied &&
          value?.documentsWithRuntimeFieldsApplied?.some(
            (doc) => doc?.ignored_fields && doc.ignored_fields?.length > 0
          )
            ? true
            : false,
        isExpensiveQueries: isExpensiveQueriesError ?? false,
      });
    }
  }, [value, error, onValidate]);

  const columns = useMemo(() => {
    return [nextField.name];
  }, [nextField.name]);

  if (loading) {
    return <LoadingPanel />;
  }

  if (
    value &&
    (value.status === 'unknown' || value.documentsWithRuntimeFieldsApplied?.length === 0)
  ) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="warning"
        iconType="warning"
        title={i18n.translate('xpack.streams.samplePreviewTable.unknownStatus', {
          defaultMessage:
            "Couldn't simulate changes due to a lack of indexed documents with this field",
        })}
      />
    );
  }

  if ((value && value.status === 'failure') || error) {
    const formattedError = error && getFormattedError(error);

    const isExpensiveQueries = formattedError?.message.includes('allow_expensive_queries');

    if (isExpensiveQueries) {
      return (
        <EuiCallOut
          announceOnMount
          color="warning"
          title={i18n.translate('xpack.streams.samplePreviewTable.warningTitle', {
            defaultMessage: 'Some fields are failing when simulating ingestion.',
          })}
        >
          {i18n.translate('xpack.streams.samplePreviewTable.expensiveQueriesDisabledWarning', {
            defaultMessage:
              'Field simulation is unavailable because expensive queries are disabled on your cluster. ' +
              'The schema changes can still be applied, but field compatibility cannot be verified in advance. ' +
              'Proceed with caution - incompatible field types may cause ingestion errors.',
          })}
        </EuiCallOut>
      );
    }
    return (
      <EuiCallOut
        announceOnMount
        color="danger"
        title={i18n.translate('xpack.streams.samplePreviewTable.errorTitle', {
          defaultMessage:
            'There was an error simulating these mapping changes with a sample of documents',
        })}
      >
        {value?.simulationError ?? formattedError?.message}
      </EuiCallOut>
    );
  }

  if (value && value.status === 'success' && value.documentsWithRuntimeFieldsApplied) {
    return (
      <div
        css={css`
          height: 500px;
        `}
      >
        <PreviewTable
          documents={value.documentsWithRuntimeFieldsApplied.slice(0, SAMPLE_DOCUMENTS_TO_SHOW)}
          renderCellValue={(doc, columnId, ignoredFields = []) => {
            const emptyCell = <>&nbsp;</>;
            const docValue = doc[columnId];

            let renderedValue = emptyCell as ReactNode;

            if (typeof docValue === 'object') {
              renderedValue = JSON.stringify(docValue);
            } else {
              renderedValue = String(docValue) || emptyCell;
            }

            const isFieldIgnored = ignoredFields.find((field) => field?.field === columnId);

            if (isFieldIgnored) {
              renderedValue = (
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiIconTip
                    position="bottom"
                    content={i18n.translate('xpack.streams.samplePreviewTable.ignoredField', {
                      defaultMessage: 'This value caused an issue and was ignored',
                    })}
                    type="warning"
                    iconProps={{
                      color: 'warning',
                    }}
                  />
                  {renderedValue}
                </EuiFlexGroup>
              );
            }

            return renderedValue;
          }}
          displayColumns={columns}
          showLeadingControlColumns={false}
        />
      </div>
    );
  }

  return null;
};
