/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiCheckbox,
  EuiFormRow,
  EuiSpacer,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EvidenceSnapshot } from '../../../../../common/investigations/types';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
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

const FORM_ID = 'investigationEvidenceAddSavedSearch';

export const SavedSearchForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const { data: choices, isLoading, error } = useSavedObjectChoices('search');
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [isManual, setIsManual] = useState(false);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preserve, setPreserve] = useState(true);
  const [showErrors, setShowErrors] = useState(false);
  const preserveId = useGeneratedHtmlId({ prefix: 'investigationEvidenceAddPreserve' });

  const hasChoices = (choices?.length ?? 0) > 0;
  const manual = isManual || (!isLoading && !hasChoices);
  const selected = choices?.find(({ id }) => id === selectedId);
  const resolvedName = manual ? name.trim() : selected?.title ?? '';
  const nameError =
    showErrors && resolvedName.length === 0
      ? manual
        ? i18n.SAVED_SEARCH_NAME_REQUIRED
        : i18n.SAVED_SEARCH_CHOOSE
      : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (resolvedName.length === 0) {
      return;
    }
    const summary =
      (manual ? description.trim() : selected?.description) || i18n.SAVED_SEARCH_SUMMARY;
    const snapshot: EvidenceSnapshot | null = preserve
      ? {
          kind: 'saved_search',
          name: resolvedName,
          summary,
          columns: manual ? [] : selected?.columns ?? [],
          rows: [],
        }
      : null;
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(resolvedName, {
            type: 'saved_search',
            why: shared.trimmedWhy,
            source: {
              label: i18n.SOURCE_SAVED_SEARCH,
              kind: 'saved_search',
              saved_object_id: manual ? null : selected?.id ?? null,
            },
            snapshot,
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
                title={i18n.SAVED_SEARCH_NONE}
                data-test-subj="investigationEvidenceAddSavedSearchEmpty"
                text={i18n.SAVED_SEARCH_NONE_BODY}
              />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <TitleField
            value={name}
            onChange={setName}
            error={nameError}
            placeholder={i18n.SAVED_SEARCH_NAME_PLACEHOLDER}
          />
          <EuiFormRow label={i18n.DESCRIPTION_LABEL} fullWidth>
            <EuiTextArea
              fullWidth
              rows={2}
              value={description}
              maxLength={INVESTIGATION_LIMITS.maxShortTextLength}
              onChange={(event) => setDescription(event.target.value)}
              data-test-subj="investigationEvidenceAddDescription"
            />
          </EuiFormRow>
        </>
      ) : (
        <SavedObjectPicker
          label={i18n.SAVED_SEARCH_LABEL}
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
      <EuiSpacer size="s" />
      <EuiCheckbox
        id={preserveId}
        label={i18n.PRESERVE_RESULTS}
        checked={preserve}
        onChange={(event) => setPreserve(event.target.checked)}
        data-test-subj="investigationEvidenceAddPreserve"
      />
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
SavedSearchForm.displayName = 'SavedSearchForm';
