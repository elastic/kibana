/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiBasicTable,
  EuiFlexGroup,
  EuiBadge,
  EuiToolTip,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useAbortController } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';
import type { MappedSchemaField, SchemaEditorField } from './types';
import type { FieldStatus } from './constants';
import { FIELD_TYPE_MAP } from './constants';
import { convertToFieldDefinitionConfig } from './utils';
import { FieldResultBadge } from './field_result';
import { FieldStatusBadge } from './field_status';

interface SchemaChangesReviewModalProps {
  onClose: () => void;
  streamType?: 'wired' | 'classic' | 'query' | 'unknown';
  definition: Streams.ingest.all.GetResponse;
  fields: SchemaEditorField[];
  storedFields: SchemaEditorField[];
  submitChanges: () => Promise<void>;
}

export function SchemaChangesReviewModal({
  fields,
  streamType,
  definition,
  storedFields,
  submitChanges,
  onClose,
}: SchemaChangesReviewModalProps) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { signal } = useAbortController();

  const changes = React.useMemo(() => getChanges(fields, storedFields), [fields, storedFields]);

  const [{ loading }, handleSubmit] = useAsyncFn(async () => {
    await submitChanges();
    onClose();
  }, [submitChanges, onClose]);

  const [hasBlockingSimulationErrors, setHasBlockingSimulationErrors] = React.useState(false);
  const [hasNonBlockingSimulationErrors, setHasNonBlockingSimulationErrors] = React.useState(false);
  const [simulationError, setSimulationError] = React.useState<string | null>(null);
  const [isSimulating, setIsSimulating] = React.useState(false);
  useEffect(() => {
    async function simulate() {
      setIsSimulating(true);
      setSimulationError(null);

      const mappedFields = changes
        .filter((field) => field.status === 'mapped')
        .map((field) => ({
          ...convertToFieldDefinitionConfig(field as MappedSchemaField),
          name: field.name,
        }));

      try {
        const simulationResults = await streamsRepositoryClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            signal,
            params: {
              path: { name: definition.stream.name },
              body: {
                field_definitions: mappedFields,
              },
            },
          }
        );

        if (simulationResults.status === 'failure') {
          setHasBlockingSimulationErrors(true);
          setSimulationError(simulationResults.simulationError);
        }
      } catch (err) {
        const errorMessage = getFormattedError(err).message;

        // Check if error is caused by expensive queries being disabled
        const isExpensiveQueriesError = errorMessage.includes('allow_expensive_queries');

        if (isExpensiveQueriesError) {
          setHasNonBlockingSimulationErrors(true);
          setSimulationError(
            i18n.translate(
              'xpack.streams.schemaEditor.confirmChangesModal.expensiveQueriesDisabledWarning',
              {
                defaultMessage:
                  'Field simulation is unavailable because expensive queries are disabled on your cluster. ' +
                  'The schema changes can still be applied, but field compatibility cannot be verified in advance. ' +
                  'Proceed with caution - incompatible field types may cause ingestion errors.',
              }
            )
          );
        } else {
          setHasBlockingSimulationErrors(true);
          setSimulationError(errorMessage);
        }
      } finally {
        setIsSimulating(false);
      }
    }

    simulate();
  }, [changes, streamsRepositoryClient, signal, definition.stream.name]);

  const confirmChangesTitle = i18n.translate(
    'xpack.streams.schemaEditor.confirmChangesModal.title',
    {
      defaultMessage: 'Confirm changes',
    }
  );

  // Check if any field has a source or result value
  const hasSource = React.useMemo(
    () => changes.some((field) => field.source && !field.esType),
    [changes]
  );
  const hasResult = React.useMemo(() => changes.some((field) => field.result), [changes]);

  const fieldColumns = React.useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnField', {
          defaultMessage: 'Field',
        }),
        width: '40%',
        render: (name: string) => (
          <EuiToolTip
            content={name}
            anchorClassName={css`
              width: 100%;
            `}
          >
            {/* Custom truncation logic because EuiTextTruncate doesn't work well in this context */}
            <div
              tabIndex={0}
              className={css`
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
              `}
            >
              {name}
            </div>
          </EuiToolTip>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnType', {
          defaultMessage: 'Type',
        }),
        width: '20%',
        truncateText: true,
        render: (type: FieldDefinitionConfig['type'] | undefined, field: SchemaEditorField) => {
          // Prioritize showing esType if available and different from our supported type
          if (field.esType && (!type || type === 'system')) {
            return (
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <FieldIcon type={field.esType} />
                {field.esType}
              </EuiFlexGroup>
            );
          }

          if (!type || field.status === 'unmapped') {
            // Only show <dynamic> for classic streams with unmapped fields
            if (streamType === 'classic') {
              const dynamicText = i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.dynamicText',
                {
                  defaultMessage: 'Dynamic',
                }
              );
              return <EuiBadge color="hollow">{dynamicText}</EuiBadge>;
            }
            // For wired streams, don't show <dynamic> for unmanaged fields
            return null;
          }

          // Handle unknown types gracefully
          const typeInfo = FIELD_TYPE_MAP[type as keyof typeof FIELD_TYPE_MAP];
          const typeLabel = typeInfo ? typeInfo.label : type;

          return (
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <FieldIcon type={type} />
              {typeLabel}
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'status',
        name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnStatus', {
          defaultMessage: 'Status',
        }),
        render: (status: FieldStatus, field: SchemaEditorField) => {
          return (
            <FieldStatusBadge
              status={status}
              uncommitted={field.uncommitted}
              streamType={streamType}
            />
          );
        },
      },
      ...(hasResult
        ? [
            {
              field: 'result',
              name: i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.tableColumnResult',
                {
                  defaultMessage: 'Result',
                }
              ),
              render: (result: SchemaEditorField['result'], field: SchemaEditorField) => {
                if (!result) return null;
                return <FieldResultBadge result={result} />;
              },
            },
          ]
        : []),
      ...(hasSource
        ? [
            {
              field: 'source',
              name: i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.tableColumnSource',
                {
                  defaultMessage: 'Source',
                }
              ),
              truncateText: true,
              render: (source: string | undefined, field: SchemaEditorField) => {
                // Don't show source for existing fields (those that have esType)
                if (field.esType) {
                  return null;
                }

                if (!source) return null;

                const sourceLabels = {
                  ecs: i18n.translate(
                    'xpack.streams.schemaEditor.confirmChangesModal.sourceLabel.ecs',
                    {
                      defaultMessage: 'ECS',
                    }
                  ),
                  otel: i18n.translate(
                    'xpack.streams.schemaEditor.confirmChangesModal.sourceLabel.otel',
                    {
                      defaultMessage: 'OTel',
                    }
                  ),
                };

                return (
                  <EuiBadge color="default">
                    {sourceLabels[source as keyof typeof sourceLabels] || source}
                  </EuiBadge>
                );
              },
            },
          ]
        : []),
    ],
    [hasResult, hasSource, streamType]
  );

  return (
    <EuiModal onClose={onClose} maxWidth={800} aria-label={confirmChangesTitle}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{confirmChangesTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {Streams.WiredStream.GetResponse.is(definition) ? (
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.schemaEditor.confirmChangesModal.affectsAllStreamsCalloutTitle',
              {
                defaultMessage: 'Schema edits affect all dependent streams.',
              }
            )}
            iconType="info"
          />
        ) : null}
        <EuiSpacer size="m" />
        <EuiText>
          {i18n.translate(
            'xpack.streams.schemaEditor.confirmChangesModal.fieldsWillBeUpdatedText',
            {
              defaultMessage: 'Some fields below will be updated.',
            }
          )}
        </EuiText>
        <EuiSpacer size="m" />
        {(hasBlockingSimulationErrors || hasNonBlockingSimulationErrors) && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.simulationErrorCalloutTitle',
                {
                  defaultMessage: 'Some fields are failing when simulating ingestion.',
                }
              )}
              iconType="warning"
              color="warning"
            >
              {simulationError}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
        <EuiBasicTable items={changes} columns={fieldColumns} />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={onClose}
          data-test-subj="streamsAppSchemaChangesReviewModalCancelButton"
        >
          <FormattedMessage
            id="xpack.streams.schemaEditor.confirmChangesModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          color="primary"
          onClick={handleSubmit}
          isLoading={loading || isSimulating}
          disabled={isSimulating || hasBlockingSimulationErrors}
          data-test-subj="streamsAppSchemaChangesReviewModalSubmitButton"
        >
          {isSimulating
            ? i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.verifyingChangesText',
                { defaultMessage: 'Verifying changes' }
              )
            : confirmChangesTitle}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}

export function getChanges(fields: SchemaEditorField[], storedFields: SchemaEditorField[]) {
  const addedFields = fields.filter(
    (field) =>
      (field.status === 'mapped' || field.status === 'unmapped') &&
      !storedFields.some((stored) => stored.name === field.name)
  );

  const changedFields = fields.filter((field) => {
    const stored = storedFields.find(
      (storedField) => field.status !== 'inherited' && storedField.name === field.name
    );
    return stored && !isEqual(stored, field);
  });

  return [...addedFields, ...changedFields];
}
