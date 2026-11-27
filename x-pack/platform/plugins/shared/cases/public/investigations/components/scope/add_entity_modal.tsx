/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSelect,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { ENTITY_TYPE_LABELS } from '../../../../common/investigations/types';
import type { EntityItem, EntityScope, EntityType } from '../../../../common/investigations/types';
import { useBulkCreateItems, useInvestigationToasts } from '../../hooks';
import { ENTITY_TYPE_ORDER, SCOPE_STATUS_LABELS, SELECTABLE_SCOPE_STATUSES } from './scope_helpers';
import * as i18n from './translations';

const MAX_NAME_LENGTH = 512;
const CREATE_STATUSES: readonly EntityScope[] = SELECTABLE_SCOPE_STATUSES.filter(
  (status) => status !== 'dismissed'
);

export interface AddEntityModalProps {
  recordId: string;
  entities: readonly EntityItem[];
  onClose: () => void;
  onCreated: (entity: EntityItem) => void;
}

export const AddEntityModal: React.FC<AddEntityModalProps> = ({
  recordId,
  entities,
  onClose,
  onCreated,
}) => {
  const titleId = useGeneratedHtmlId();
  const { showSuccess } = useInvestigationToasts();
  const { mutate, isLoading } = useBulkCreateItems(recordId);
  const [type, setType] = useState<EntityType>('host');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<EntityScope>('scoped');
  const [criticality, setCriticality] = useState<string>(i18n.CRITICALITY_OPTIONS[4]);
  const [submitted, setSubmitted] = useState(false);

  const trimmed = name.trim();
  const isExternal = type === 'external';
  const nameError =
    trimmed.length === 0
      ? i18n.NAME_REQUIRED
      : trimmed.length > MAX_NAME_LENGTH
      ? i18n.NAME_TOO_LONG
      : entities.some(
          (entity) =>
            entity.entity.type === type &&
            entity.entity.name.toLowerCase() === trimmed.toLowerCase()
        )
      ? i18n.NAME_EXISTS
      : null;
  const showError = submitted && nameError !== null;

  const submit = () => {
    setSubmitted(true);
    if (nameError) {
      return;
    }
    mutate(
      {
        items: [
          {
            kind: 'entity',
            title: trimmed,
            status: isExternal ? 'external' : status,
            entity: {
              type,
              name: trimmed,
              criticality: isExternal ? null : criticality,
              evidence_ids: [],
              attributes: [],
              tags: [],
            },
          },
        ],
      },
      {
        onSuccess: ({ items }) => {
          showSuccess(i18n.ADD_ENTITY_SUCCESS(trimmed));
          const created = items.find((item): item is EntityItem => item.kind === 'entity');
          if (created) {
            onCreated(created);
          }
          onClose();
        },
      }
    );
  };

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="investigationAddEntityModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{i18n.ADD_ENTITY_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiForm
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <EuiFormRow label={i18n.ADD_ENTITY_TYPE} fullWidth>
            <EuiSelect
              fullWidth
              value={type}
              options={ENTITY_TYPE_ORDER.map((value) => ({
                value,
                text: ENTITY_TYPE_LABELS[value],
              }))}
              onChange={(event) =>
                setType(ENTITY_TYPE_ORDER.find((value) => value === event.target.value) ?? 'host')
              }
              data-test-subj="investigationAddEntityType"
            />
          </EuiFormRow>
          <EuiFormRow
            label={i18n.ADD_ENTITY_NAME}
            isInvalid={showError}
            error={nameError ?? undefined}
            fullWidth
          >
            <EuiFieldText
              fullWidth
              autoFocus
              value={name}
              isInvalid={showError}
              maxLength={MAX_NAME_LENGTH + 1}
              placeholder={i18n.ADD_ENTITY_NAME_PLACEHOLDER}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="investigationAddEntityName"
            />
          </EuiFormRow>
          {isExternal ? (
            <EuiCallOut size="s" announceOnMount={false} title={i18n.EXTERNAL_STATUS_NOTE} />
          ) : (
            <>
              <EuiFormRow label={i18n.ADD_ENTITY_STATUS} fullWidth>
                <EuiSelect
                  fullWidth
                  value={status}
                  options={CREATE_STATUSES.map((value) => ({
                    value,
                    text: SCOPE_STATUS_LABELS[value],
                  }))}
                  onChange={(event) =>
                    setStatus(
                      CREATE_STATUSES.find((value) => value === event.target.value) ?? 'scoped'
                    )
                  }
                  data-test-subj="investigationAddEntityStatus"
                />
              </EuiFormRow>
              <EuiFormRow label={i18n.ADD_ENTITY_CRITICALITY} fullWidth>
                <EuiSelect
                  fullWidth
                  value={criticality}
                  options={i18n.CRITICALITY_OPTIONS.map((value) => ({ value, text: value }))}
                  onChange={(event) => setCriticality(event.target.value)}
                  data-test-subj="investigationAddEntityCriticality"
                />
              </EuiFormRow>
            </>
          )}
        </EuiForm>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="investigationAddEntityCancel">
          {i18n.CANCEL}
        </EuiButtonEmpty>
        <EuiButton
          fill
          isLoading={isLoading}
          onClick={submit}
          data-test-subj="investigationAddEntitySubmit"
        >
          {i18n.ADD_ENTITY_SUBMIT}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
AddEntityModal.displayName = 'AddEntityModal';
