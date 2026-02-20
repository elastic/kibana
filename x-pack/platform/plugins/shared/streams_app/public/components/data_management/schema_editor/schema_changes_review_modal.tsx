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
  EuiAccordion,
  EuiLoadingSpinner,
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
import type { FieldConflict } from '@kbn/streams-plugin/server/routes/internal/streams/schema/route';
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
  const [fieldConflicts, setFieldConflicts] = React.useState<FieldConflict[]>([]);

  useEffect(() => {
    async function simulate() {
      setIsSimulating(true);
      setSimulationError(null);
      setFieldConflicts([]);

      const mappedFields = changes
        .filter((field) => field.status === 'mapped')
        .map((field) => ({
          ...convertToFieldDefinitionConfig(field as MappedSchemaField),
          name: field.name,
        }));

      // Run simulation and conflict detection in parallel
      const simulationPromise = streamsRepositoryClient.fetch(
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

      const conflictsPromise = streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/schema/fields_conflicts',
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

      try {
        const [simulationResults, conflictsResults] = await Promise.all([
          simulationPromise.catch((err) => ({ error: err })),
          conflictsPromise.catch((err) => ({ error: err })),
        ]);

        // Handle simulation results
        if ('error' in simulationResults) {
          const errorMessage = getFormattedError(simulationResults.error).message;

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
        } else if (simulationResults.status === 'failure') {
          setHasBlockingSimulationErrors(true);
          setSimulationError(simulationResults.simulationError);
        }

        // Handle conflicts results (non-blocking warnings)
        if (!('error' in conflictsResults) && conflictsResults.conflicts.length > 0) {
          setFieldConflicts(conflictsResults.conflicts);
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
        {/* Combined callout for wired streams - shows dependent streams message with conflict status */}
        {Streams.WiredStream.GetResponse.is(definition) && (
          <>
            <EuiCallOut
              announceOnMount
              title={i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.affectsAllStreamsCalloutTitle',
                {
                  defaultMessage: 'Schema edits affect all dependent streams.',
                }
              )}
              iconType={fieldConflicts.length > 0 ? 'warning' : 'info'}
              color={fieldConflicts.length > 0 ? 'warning' : undefined}
              data-test-subj={
                isSimulating
                  ? 'streamsAppSchemaChangesCheckingConflicts'
                  : fieldConflicts.length > 0
                  ? 'streamsAppSchemaChangesFieldConflictsWarning'
                  : 'streamsAppSchemaChangesNoConflicts'
              }
            >
              {isSimulating ? (
                <EuiFlexGroup gutterSize="s" alignItems="center">
                  <EuiLoadingSpinner size="s" />
                  <span>
                    {i18n.translate(
                      'xpack.streams.schemaEditor.confirmChangesModal.checkingConflictsTitle',
                      {
                        defaultMessage: 'Checking for conflicts...',
                      }
                    )}
                  </span>
                </EuiFlexGroup>
              ) : fieldConflicts.length > 0 ? (
                <>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.streams.schemaEditor.confirmChangesModal.fieldConflictsDescription"
                      defaultMessage="The following fields are defined with different types in other streams. This may cause issues if data is queried across streams."
                    />
                  </EuiText>
                  <EuiSpacer size="s" />
                  {fieldConflicts.map((conflict) => (
                    <EuiAccordion
                      key={conflict.fieldName}
                      id={`conflict-${conflict.fieldName}`}
                      buttonContent={
                        <EuiFlexGroup gutterSize="s" alignItems="center">
                          <EuiText size="s">
                            <strong>{conflict.fieldName}</strong>
                          </EuiText>
                          <EuiBadge color="hollow">
                            <FormattedMessage
                              id="xpack.streams.schemaEditor.confirmChangesModal.conflictStreamCount"
                              defaultMessage="{count} {count, plural, one {stream} other {streams}}"
                              values={{ count: conflict.conflictingStreams.length }}
                            />
                          </EuiBadge>
                        </EuiFlexGroup>
                      }
                      paddingSize="s"
                    >
                      <EuiText size="xs">
                        <FormattedMessage
                          id="xpack.streams.schemaEditor.confirmChangesModal.conflictProposedType"
                          defaultMessage="Proposed type: {type}"
                          values={{
                            type: (
                              <strong>
                                {FIELD_TYPE_MAP[
                                  conflict.proposedType as keyof typeof FIELD_TYPE_MAP
                                ]?.label || conflict.proposedType}
                              </strong>
                            ),
                          }}
                        />
                      </EuiText>
                      <EuiSpacer size="xs" />
                      <ul>
                        {conflict.conflictingStreams.map((conflictingStream) => (
                          <li key={conflictingStream.streamName}>
                            <EuiText size="xs">
                              <strong>{conflictingStream.streamName}</strong>:{' '}
                              {FIELD_TYPE_MAP[
                                conflictingStream.existingType as keyof typeof FIELD_TYPE_MAP
                              ]?.label || conflictingStream.existingType}
                            </EuiText>
                          </li>
                        ))}
                      </ul>
                    </EuiAccordion>
                  ))}
                </>
              ) : (
                <EuiText size="s">
                  {i18n.translate(
                    'xpack.streams.schemaEditor.confirmChangesModal.noConflictsTitle',
                    {
                      defaultMessage: 'No conflicts found.',
                    }
                  )}
                </EuiText>
              )}
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}
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
