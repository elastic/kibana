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
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceVars } from './use_service_settings';
import type { TransportType } from './field_config';
import { getRequiredTextFields } from './field_config';
import { ServiceFieldsForm } from './service_fields_form';
import { isDuplicateNameTaken } from './duplicate_name';

interface DuplicateServiceModalProps {
  service: AwsServiceMatrixEntry;
  sourceConfig: ServiceVars;
  /** Pre-filled name suggestion (e.g. "AWS CloudTrail [Duplicate]"). */
  suggestedName: string;
  /** All existing instance names — used for collision detection. */
  existingNames: string[];
  onAdd: (name: string, fields: Record<string, string>, transport: TransportType | null) => void;
  onCancel: () => void;
}

export function DuplicateServiceModal({
  service,
  sourceConfig,
  suggestedName,
  existingNames,
  onAdd,
  onCancel,
}: DuplicateServiceModalProps) {
  const [name, setName] = useState(suggestedName);
  const [nameTouched, setNameTouched] = useState(false);

  const [draft, setDraft] = useState<Record<string, string>>({ ...sourceConfig.vars });
  const [draftTransport, setDraftTransport] = useState<TransportType | null>(sourceConfig.trigger);

  const handleFieldChange = (fieldName: string, value: string) => {
    setDraft((prev) => ({ ...prev, [fieldName]: value }));
  };

  const trimmedName = name.trim();
  const nameEmpty = trimmedName === '';
  const nameTaken = !nameEmpty && isDuplicateNameTaken(trimmedName, existingNames);
  const nameInvalid = nameEmpty || nameTaken;

  const requiredTextFields = getRequiredTextFields(service, draftTransport);
  const anyRequiredEmpty = requiredTextFields.some((f) => !(draft[f] ?? '').trim());

  const canAdd = !nameInvalid && !anyRequiredEmpty;

  const nameError = nameEmpty
    ? i18n.translate('xpack.ingestHub.serviceSettingsStep.duplicateModal.name.errorEmpty', {
        defaultMessage: 'A service name is required.',
      })
    : nameTaken
    ? i18n.translate('xpack.ingestHub.serviceSettingsStep.duplicateModal.name.errorTaken', {
        defaultMessage: 'This name is already in use. Choose a different name.',
      })
    : undefined;

  const handleAdd = () => {
    if (!canAdd) {
      setNameTouched(true);
      return;
    }
    onAdd(trimmedName, draft, draftTransport);
  };

  return (
    <EuiModal
      onClose={onCancel}
      aria-labelledby="duplicateServiceModalTitle"
      data-test-subj="duplicateServiceModal"
      style={{ minWidth: 480 }}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id="duplicateServiceModalTitle">
          <FormattedMessage
            id="xpack.ingestHub.serviceSettingsStep.duplicateModal.title"
            defaultMessage="Duplicate service"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.ingestHub.serviceSettingsStep.duplicateModal.body"
              defaultMessage="Add another instance of {serviceName}."
              values={{ serviceName: <strong>{service.name}</strong> }}
            />
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.ingestHub.serviceSettingsStep.duplicateModal.name.label', {
            defaultMessage: 'Service name',
          })}
          isInvalid={nameTouched && nameInvalid}
          error={nameTouched && nameInvalid ? nameError : undefined}
        >
          <EuiFieldText
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
            onBlur={() => setNameTouched(true)}
            isInvalid={nameTouched && nameInvalid}
            data-test-subj="duplicateServiceModal-nameField"
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <ServiceFieldsForm
          service={service}
          draft={draft}
          draftTransport={draftTransport}
          onFieldChange={handleFieldChange}
          onTransportChange={setDraftTransport}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="duplicateServiceModal-cancelButton">
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.duplicateModal.cancelButton"
                defaultMessage="Cancel"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleAdd}
              isDisabled={!canAdd}
              data-test-subj="duplicateServiceModal-addButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.serviceSettingsStep.duplicateModal.addButton"
                defaultMessage="Add"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
