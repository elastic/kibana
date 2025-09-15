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
  EuiToken,
} from '@elastic/eui';
import { isEqual } from 'lodash';
import { FieldIcon } from '@kbn/react-field';
import type { FieldDefinitionConfig } from '@kbn/streams-schema';
import useAsyncFn from 'react-use/lib/useAsyncFn';
import { useAbortController } from '@kbn/react-hooks';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import type { MappedSchemaField, SchemaField } from './types';
import { FIELD_TYPE_MAP } from './constants';
import { convertToFieldDefinitionConfig } from './utils';

interface SchemaChangesReviewModalProps {
  onClose: () => void;
  stream: string;
  fields: SchemaField[];
  storedFields: SchemaField[];
  submitChanges: () => Promise<void>;
}

export function SchemaChangesReviewModal({
  fields,
  stream,
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

  const changes = React.useMemo(() => {
    const addedFields = fields.filter(
      (field) => !storedFields.some((stored) => stored.name === field.name)
    );

    const changedFields = fields.filter((field) => {
      const stored = storedFields.find((storedField) => storedField.name === field.name);
      return stored && !isEqual(stored, field);
    });

    return [...addedFields, ...changedFields];
  }, [fields, storedFields]);

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

      const simulationResults = await streamsRepositoryClient.fetch(
        'POST /internal/streams/{name}/schema/fields_simulation',
        {
          signal,
          params: {
            path: { name: stream },
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

      setIsSimulating(false);
    }

    simulate();
  }, [changes, streamsRepositoryClient, signal, stream]);

  const confirmChangesTitle = i18n.translate(
    'xpack.streams.schemaEditor.confirmChangesModal.title',
    {
      defaultMessage: 'Confirm changes',
    }
  );

  return (
    <EuiModal onClose={onClose} maxWidth={600} aria-label={confirmChangesTitle}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>{confirmChangesTitle}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut
          title={i18n.translate(
            'xpack.streams.schemaEditor.confirmChangesModal.affectsAllStreamsCalloutTitle',
            {
              defaultMessage: 'Schema edits affect all dependent streams.',
            }
          )}
          iconType="info"
        />
        <EuiSpacer size="m" />
        <EuiText>
          {i18n.translate(
            'xpack.streams.schemaEditor.confirmChangesModal.fieldsWillBeUpdatedText',
            {
              defaultMessage: 'The fields below will be updated.',
            }
          )}
        </EuiText>
        <EuiSpacer size="m" />
        {hasSimulationErrors && (
          <>
            <EuiCallOut
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
        <EuiBasicTable
          items={changes}
          columns={[
            {
              field: 'name',
              name: i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.tableColumnName',
                { defaultMessage: 'Name' }
              ),
            },
            {
              field: 'type',
              name: i18n.translate(
                'xpack.streams.schemaEditor.confirmChangesModal.tableColumnType',
                { defaultMessage: 'Type' }
              ),
              render: (type: FieldDefinitionConfig['type'] | undefined, field: SchemaField) => {
                if (!type || field.status === 'unmapped')
                  return (
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiToken iconType="tokenNull" />
                      <FormattedMessage
                        id="xpack.streams.schemaEditor.unmanagedLabel"
                        defaultMessage="Unmanaged"
                      />
                    </EuiFlexGroup>
                  );

                return (
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <FieldIcon type={type} />
                    {FIELD_TYPE_MAP[type].label}
                  </EuiFlexGroup>
                );
              },
            },
          ]}
        />
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose}>
          <FormattedMessage
            id="xpack.streams.schemaEditor.confirmChangesModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          fill
          color="primary"
          onClick={handleSubmit}
          isLoading={loading}
          disabled={isSimulating || hasSimulationErrors}
        >
          {confirmChangesTitle}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
