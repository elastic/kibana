/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCallOut, EuiFilePicker, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { useInvestigationToasts, useUploadFile } from '../../../hooks';
import { ICONS } from '../../../icons';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields } from './common_fields';
import { useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddFile';
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

export const FileForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const shared = useSharedFields(recordId);
  const { linkToClaim } = useCreateEvidence(recordId);
  const upload = useUploadFile(recordId);
  const { showSuccess } = useInvestigationToasts();
  const [file, setFile] = useState<File | undefined>();
  const [showErrors, setShowErrors] = useState(false);

  const fileError = !file
    ? showErrors
      ? i18n.FILE_REQUIRED
      : undefined
    : file.size > MAX_FILE_BYTES
    ? i18n.FILE_TOO_LARGE(Math.round(MAX_FILE_BYTES / (1024 * 1024)))
    : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (!file || file.size > MAX_FILE_BYTES) {
      return;
    }
    try {
      const { item } = await upload.mutateAsync({ file, why: shared.trimmedWhy ?? undefined });
      if (shared.claim) {
        await linkToClaim([item], shared.claim);
      }
      showSuccess(i18n.ADDED_ONE(item.ref));
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
      isLoading={upload.isLoading}
      submitLabel={upload.isLoading ? i18n.UPLOADING : i18n.ADD_EVIDENCE}
    >
      <EuiFormRow
        label={i18n.FILE_LABEL}
        helpText={i18n.FILE_HELP}
        isInvalid={Boolean(fileError)}
        error={fileError}
        fullWidth
      >
        <EuiFilePicker
          fullWidth
          initialPromptText={i18n.FILE_PROMPT}
          isInvalid={Boolean(fileError)}
          disabled={upload.isLoading}
          onChange={(files) => setFile(files?.item(0) ?? undefined)}
          data-test-subj="investigationEvidenceAddFilePicker"
        />
      </EuiFormRow>
      {upload.isLoading ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            iconType={ICONS.upload}
            title={i18n.UPLOADING_TITLE}
            data-test-subj="investigationEvidenceAddFileProgress"
            text={i18n.UPLOADING_BODY}
          />
        </>
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
FileForm.displayName = 'FileForm';
