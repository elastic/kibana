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
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useAbortController } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';
import type { MappedSchemaField, SchemaField } from './types';
import { FIELD_TYPE_MAP } from './constants';
import { convertToFieldDefinitionConfig } from './utils';

interface SchemaChangesReviewModalProps {
  onClose: () => void;
  streamType?: 'wired' | 'classic' | 'unknown';
  definition: Streams.ingest.all.GetResponse;
  fields: SchemaField[];
  storedFields: SchemaField[];
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

  const existingFields = React.useMemo(() => {
    // Fields that have esType (from Field Caps API) - these are existing in ES
    return changes.filter((field) => field.esType && field.status === 'mapped');
  }, [changes]);

  const autoMappedFields = React.useMemo(() => {
    // Fields that have source (from metadata service) but no esType - these are new and auto-mapped
    return changes.filter((field) => field.status === 'mapped' && field.source && !field.esType);
  }, [changes]);

  const reviewRequiredFields = React.useMemo(() => {
    // Fields that need manual review (unmapped)
    return changes.filter((field) => field.status === 'unmapped');
  }, [changes]);

  // Sort changes to show review required first, then auto-mapped, then existing
  const sortedChanges = React.useMemo(() => {
    return [...changes].sort((a, b) => {
      const getFieldPriority = (field: SchemaField) => {
        if (reviewRequiredFields.includes(field)) return 1; // Highest priority
        if (autoMappedFields.includes(field)) return 2;
        if (existingFields.includes(field)) return 3; // Lowest priority
        return 4; // Fallback
      };

      return getFieldPriority(a) - getFieldPriority(b);
    });
  }, [changes, reviewRequiredFields, autoMappedFields, existingFields]);

  const [{ loading }, handleSubmit] = useAsyncFn(async () => {
    await submitChanges();
    onClose();
  }, [submitChanges, onClose]);

  const [hasSimulationErrors, setHasSimulationErrors] = React.useState(false);
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
          setHasSimulationErrors(true);
          setSimulationError(simulationResults.simulationError);
        }
      } catch (err) {
        setHasSimulationErrors(true);
        setSimulationError(getFormattedError(err).message);
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

  const fieldColumns = [
    {
      field: 'name',
      name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnField', {
        defaultMessage: 'Field',
      }),
      render: (name: string) => <>{name}</>,
    },
    {
      field: 'type',
      name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnType', {
        defaultMessage: 'type',
      }),
      render: (type: FieldDefinitionConfig['type'] | undefined, field: SchemaField) => {
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
      width: '200px',
      render: (status: string, field: SchemaField) => {
        if (reviewRequiredFields.includes(field)) {
          return (
            <EuiBadge color="warning">
              {i18n.translate('xpack.streams.fieldColumns.newReviewRequiredBadgeLabel', {
                defaultMessage: 'Review required',
              })}
            </EuiBadge>
          );
        }
        if (autoMappedFields.includes(field)) {
          return (
            <EuiBadge color="success">
              {i18n.translate('xpack.streams.fieldColumns.newAutomaticallyMappedBadgeLabel', {
                defaultMessage: 'Automatically mapped',
              })}
            </EuiBadge>
          );
        }
        if (existingFields.includes(field)) {
          return (
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.fieldColumns.existingBadgeLabel', {
                defaultMessage: 'Existing',
              })}
            </EuiBadge>
          );
        }
        return <EuiBadge color="default">{status}</EuiBadge>;
      },
    },
    {
      field: 'source',
      name: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.tableColumnSource', {
        defaultMessage: 'Source',
      }),
      render: (source: string | undefined, field: SchemaField) => {
        // Don't show source for existing fields (those that are truly from ES)
        if (existingFields.includes(field)) {
          return null;
        }

        if (!source) return null;

        const sourceLabels = {
          ecs: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.sourceLabel.ecs', {
            defaultMessage: 'ECS Standard',
          }),
          otel: i18n.translate('xpack.streams.schemaEditor.confirmChangesModal.sourceLabel.otel', {
            defaultMessage: 'OpenTelemetry',
          }),
        };

        return (
          <EuiBadge color="default">
            {sourceLabels[source as keyof typeof sourceLabels] || source}
          </EuiBadge>
        );
      },
    },
  ];

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
        {hasSimulationErrors && (
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
        <EuiBasicTable items={sortedChanges} columns={fieldColumns} />
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
          disabled={isSimulating || hasSimulationErrors}
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

export function getChanges(fields: SchemaField[], storedFields: SchemaField[]) {
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
