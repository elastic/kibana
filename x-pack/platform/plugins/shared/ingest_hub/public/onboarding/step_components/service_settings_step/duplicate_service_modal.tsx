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
import { makeDsView } from '../../aws_service_matrix';
import type { ServiceVars, ServiceDataStreamVars } from './use_service_settings';
import { getRequiredTextFields, resolveFieldMeta, toTyped } from './field_config';
import { ServiceFieldsForm } from './service_fields_form';
import { isDuplicateNameTaken } from './duplicate_name';

interface DuplicateServiceModalProps {
  service: AwsServiceMatrixEntry;
  sourceConfig: ServiceVars;
  /** Pre-filled name suggestion (e.g. "AWS CloudTrail [Duplicate]"). */
  suggestedName: string;
  /** All existing instance names — used for collision detection. */
  existingNames: string[];
  globalRegion: string;
  onAdd: (
    name: string,
    varsByDataStream: Record<string, ServiceDataStreamVars>,
    enabledDataStreams: string[]
  ) => void;
  onCancel: () => void;
}

export function DuplicateServiceModal({
  service,
  sourceConfig,
  suggestedName,
  existingNames,
  globalRegion,
  onAdd,
  onCancel,
}: DuplicateServiceModalProps) {
  const [name, setName] = useState(suggestedName);
  const [nameTouched, setNameTouched] = useState(false);

  const [draftByDs, setDraftByDs] = useState<Record<string, ServiceDataStreamVars>>(() => ({
    ...sourceConfig.varsByDataStream,
  }));

  const trimmedName = name.trim();
  const nameEmpty = trimmedName === '';
  const nameTaken = !nameEmpty && isDuplicateNameTaken(trimmedName, existingNames);
  const nameInvalid = nameEmpty || nameTaken;

  const singleDs = service.dataStreams.length === 1;
  const enabledDsFromInputs = service.dataStreams.filter((dsId) => {
    const dsVars = draftByDs[dsId];
    if (dsVars) return dsVars.enabledInputs.length > 0;
    if (singleDs) return true;
    return (service.varDefsByDataStream?.[dsId]?.defaultEnabledInputs?.length ?? 0) > 0;
  });
  const activeDataStreams =
    enabledDsFromInputs.length > 0 ? enabledDsFromInputs : service.dataStreams;

  const anyRequiredEmpty = activeDataStreams.some((dsId) => {
    const dsInfo = service.varDefsByDataStream?.[dsId];
    const dsVars = draftByDs[dsId] ?? { enabledInputs: [], varsByInput: {} };
    const activeInputs = dsVars.enabledInputs.length
      ? dsVars.enabledInputs
      : singleDs
      ? dsInfo?.inputs ?? []
      : dsInfo?.defaultEnabledInputs?.length
      ? dsInfo.defaultEnabledInputs
      : dsInfo?.inputs?.slice(0, 1) ?? [];
    const dsView = makeDsView(service, dsId);
    return activeInputs.some((inp) =>
      getRequiredTextFields(dsView, inp).some((f) => {
        const meta = resolveFieldMeta(dsView, inp, f);
        const raw = dsVars.varsByInput[inp]?.[f];
        const effective = meta ? toTyped(raw, meta) : raw ?? '';
        if (Array.isArray(effective)) return effective.length === 0;
        return typeof effective === 'string' && !effective.trim();
      })
    );
  });

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
    const enabledDataStreams = service.dataStreams.filter((dsId) => {
      const dsVars = draftByDs[dsId];
      if (dsVars) return dsVars.enabledInputs.length > 0;
      if (singleDs) return true;
      return (service.varDefsByDataStream?.[dsId]?.defaultEnabledInputs?.length ?? 0) > 0;
    });
    onAdd(trimmedName, draftByDs, enabledDataStreams);
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
          varsByDataStream={draftByDs}
          globalRegion={globalRegion}
          onFieldChange={(dsId, input, fieldName, value) =>
            setDraftByDs((prev) => {
              const dsInfo = service.varDefsByDataStream?.[dsId];
              const defaultInputs = singleDs
                ? dsInfo?.inputs ?? []
                : dsInfo?.defaultEnabledInputs ?? [];
              const existing = prev[dsId] ?? { enabledInputs: defaultInputs, varsByInput: {} };
              return {
                ...prev,
                [dsId]: {
                  ...existing,
                  varsByInput: {
                    ...existing.varsByInput,
                    [input]: { ...(existing.varsByInput[input] ?? {}), [fieldName]: value },
                  },
                },
              };
            })
          }
          onInputToggle={(dsId, input, enabled) =>
            setDraftByDs((prev) => {
              const dsInfo = service.varDefsByDataStream?.[dsId];
              const defaultInputs = singleDs
                ? dsInfo?.inputs ?? []
                : dsInfo?.defaultEnabledInputs ?? [];
              const existing = prev[dsId] ?? { enabledInputs: defaultInputs, varsByInput: {} };
              return {
                ...prev,
                [dsId]: {
                  ...existing,
                  enabledInputs: enabled
                    ? [...existing.enabledInputs, input]
                    : existing.enabledInputs.filter((i) => i !== input),
                },
              };
            })
          }
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
