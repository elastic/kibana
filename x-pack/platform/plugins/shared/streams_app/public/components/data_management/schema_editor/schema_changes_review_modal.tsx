/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import type { SchemaField } from './types';
import { FIELD_TYPE_MAP } from './constants';

interface SchemaChangesReviewModalProps {
  onClose: () => void;
  fields: SchemaField[];
  storedFields: SchemaField[];
  submitChanges: () => Promise<void>;
}

export function SchemaChangesReviewModal({
  fields,
  storedFields,
  submitChanges,
  onClose,
}: SchemaChangesReviewModalProps) {
  const addedFields = fields.filter(
    (field) => !storedFields.some((stored) => stored.name === field.name)
  );

  const changedFields = fields.filter((field) => {
    const stored = storedFields.find((storedField) => storedField.name === field.name);
    return stored && !isEqual(stored, field);
  });

  const changes = [...addedFields, ...changedFields];

  const [{ loading }, handleSubmit] = useAsyncFn(async () => {
    await submitChanges();
    onClose();
  }, [submitChanges, onClose]);

  const hasSimulationErrors = false; // TODO: Run simulation and check for errors
  // Also validate that all fields are complete

  return (
    <EuiModal onClose={onClose} maxWidth={600} aria-label="Confirm changes">
      <EuiModalHeader>
        <EuiModalHeaderTitle>Confirm changes</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiCallOut title="Schema edits affect all dependent streams." iconType="info" />
        <EuiSpacer size="m" />
        <EuiText>
          The fields below will be updated. Any errors from validation will also appear here.
        </EuiText>
        <EuiSpacer size="m" />
        {hasSimulationErrors && (
          <>
            <EuiCallOut
              title="Some fields are failing when simulating ingestion."
              iconType="warning"
              color="warning"
            />
            <EuiSpacer size="m" />
          </>
        )}
        <EuiBasicTable
          items={changes}
          columns={[
            {
              field: 'name',
              name: 'Name',
            },
            {
              field: 'type',
              name: 'Type',
              render: (type?: FieldDefinitionConfig['type']) => {
                if (!type)
                  return (
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiToken iconType="tokenNull" />
                      Removed
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
        <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
        <EuiButton
          fill
          color="primary"
          onClick={handleSubmit}
          isLoading={loading}
          disabled={hasSimulationErrors}
        >
          Confirm changes
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
}
