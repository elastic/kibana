/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { getHttpErrorMessage } from '../../../hooks/errors';
import { ICONS } from '../../../icons';
import { useSavedObjectChoices } from '../use_evidence_queries';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields, TitleField } from './common_fields';
import { SavedObjectPicker } from './saved_object_picker';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddVisualization';

export const VisualizationForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const { data: choices, isLoading, error } = useSavedObjectChoices('lens');
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [isManual, setIsManual] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const hasChoices = (choices?.length ?? 0) > 0;
  const manual = isManual || (!isLoading && !hasChoices);
  const selected = choices?.find(({ id }) => id === selectedId);
  const resolvedName = manual ? name.trim() : selected?.title ?? '';
  const nameError =
    showErrors && resolvedName.length === 0
      ? manual
        ? i18n.VISUALIZATION_NAME_REQUIRED
        : i18n.VISUALIZATION_CHOOSE
      : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (resolvedName.length === 0) {
      return;
    }
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(resolvedName, {
            type: 'visualization',
            why: shared.trimmedWhy,
            source: {
              label: i18n.SOURCE_VISUALIZATION,
              kind: 'visualization',
              saved_object_id: manual ? null : selected?.id ?? null,
            },
            snapshot: {
              kind: 'visualization',
              name: resolvedName,
              app: i18n.SOURCE_VISUALIZATION,
              description: manual ? undefined : selected?.description || undefined,
            },
          }),
        ],
      });
      onDone();
    } catch {
      // The mutation already showed the error.
    }
  };

  return (
    <AddFormLayout
      formId={FORM_ID}
      onBack={onBack}
      onSubmit={() => void submit()}
      isLoading={isSaving}
    >
      {manual ? (
        <>
          {error ? (
            <>
              <EuiCallOut
                announceOnMount
                color="danger"
                iconType={ICONS.error}
                size="s"
                title={i18n.PICKER_LOAD_ERROR}
                text={<p>{getHttpErrorMessage(error)}</p>}
                data-test-subj="investigationEvidenceAddPickerError"
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          {!hasChoices && !isLoading && !error ? (
            <>
              <EuiCallOut
                announceOnMount
                size="s"
                iconType={ICONS.info}
                title={i18n.VISUALIZATION_NONE}
                data-test-subj="investigationEvidenceAddVisualizationEmpty"
                text={i18n.VISUALIZATION_NONE_BODY}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <TitleField
            value={name}
            onChange={setName}
            error={nameError}
            placeholder={i18n.VISUALIZATION_NAME_PLACEHOLDER}
          />
        </>
      ) : (
        <SavedObjectPicker
          label={i18n.VISUALIZATION_LABEL}
          choices={choices}
          isLoading={isLoading}
          error={error}
          selectedId={selectedId}
          onSelect={setSelectedId}
          validationError={nameError}
        />
      )}
      {hasChoices ? (
        <EuiButtonEmpty
          size="xs"
          flush="left"
          onClick={() => setIsManual((current) => !current)}
          data-test-subj="investigationEvidenceAddToggleManual"
        >
          {manual ? i18n.PICK_FROM_LIST : i18n.ENTER_MANUALLY}
        </EuiButtonEmpty>
      ) : null}
      <SharedFields
        value={shared.why}
        onChange={shared.setWhy}
        claims={shared.claims}
        claimId={shared.claimId}
        onClaimChange={shared.setClaimId}
      />
    </AddFormLayout>
  );
};
VisualizationForm.displayName = 'VisualizationForm';
