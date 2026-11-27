/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, useGeneratedHtmlId } from '@elastic/eui';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { MarkdownEditor } from '../../../../components/markdown_editor';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields, TitleField } from './common_fields';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddNote';
const DISABLED_UI_PLUGINS = ['lens'];

export const NoteForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const editorId = useGeneratedHtmlId({ prefix: 'investigationEvidenceAddNoteEditor' });
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const trimmedText = text.trim();
  const textError = showErrors && trimmedText.length === 0 ? i18n.NOTE_REQUIRED : undefined;
  const titleError = showErrors && title.trim().length === 0 ? i18n.TITLE_REQUIRED : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (trimmedText.length === 0 || title.trim().length === 0) {
      return;
    }
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(
            title,
            {
              type: 'note',
              why: shared.trimmedWhy,
              source: { label: i18n.SOURCE_NOTE, kind: 'manual' },
              snapshot: { kind: 'note', text: trimmedText },
            },
            { text: trimmedText }
          ),
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
      <TitleField
        value={title}
        onChange={setTitle}
        error={titleError}
        placeholder={i18n.TITLE_PLACEHOLDER}
      />
      <EuiFormRow
        label={i18n.NOTE_LABEL}
        isInvalid={Boolean(textError)}
        error={textError}
        fullWidth
      >
        <MarkdownEditor
          ariaLabel={i18n.NOTE_LABEL}
          editorId={editorId}
          value={text}
          onChange={(value) => setText(value.slice(0, INVESTIGATION_LIMITS.maxTextLength))}
          height={180}
          disabledUiPlugins={DISABLED_UI_PLUGINS}
          data-test-subj="investigationEvidenceAddNoteText"
        />
      </EuiFormRow>
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
NoteForm.displayName = 'NoteForm';
