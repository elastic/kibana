/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormRow, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { INVESTIGATION_LIMITS } from '../../../../../common/investigations/constants';
import { AddFormLayout } from './add_form_layout';
import type { AddFormProps } from './add_form_layout';
import { SharedFields, TitleField } from './common_fields';
import { toEvidenceInput, useCreateEvidence } from './use_create_evidence';
import { useSharedFields } from './use_shared_fields';
import * as i18n from '../translations';

const FORM_ID = 'investigationEvidenceAddQuery';

export const QueryForm: React.FC<AddFormProps> = ({ recordId, onDone, onBack }) => {
  const { euiTheme } = useEuiTheme();
  const shared = useSharedFields(recordId);
  const { create, isLoading: isSaving } = useCreateEvidence(recordId);
  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [showErrors, setShowErrors] = useState(false);

  const trimmedQuery = query.trim();
  const queryError = showErrors && trimmedQuery.length === 0 ? i18n.QUERY_REQUIRED : undefined;
  const titleError = showErrors && title.trim().length === 0 ? i18n.TITLE_REQUIRED : undefined;

  const submit = async () => {
    setShowErrors(true);
    if (trimmedQuery.length === 0 || title.trim().length === 0) {
      return;
    }
    try {
      await create({
        claim: shared.claim,
        inputs: [
          toEvidenceInput(title, {
            type: 'query',
            why: shared.trimmedWhy,
            source: { label: i18n.SOURCE_QUERY, kind: 'query' },
            snapshot: {
              kind: 'query',
              query: trimmedQuery,
              columns: [],
              rows: [],
              meta: i18n.QUERY_NOT_RUN,
              note: i18n.QUERY_NOT_RUN_NOTE,
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
      <EuiFormRow
        label={i18n.QUERY_LABEL}
        isInvalid={Boolean(queryError)}
        error={queryError}
        fullWidth
      >
        <EuiTextArea
          fullWidth
          rows={6}
          value={query}
          isInvalid={Boolean(queryError)}
          placeholder={i18n.QUERY_PLACEHOLDER}
          maxLength={INVESTIGATION_LIMITS.maxTextLength}
          onChange={(event) => setQuery(event.target.value)}
          css={css`
            font-family: ${euiTheme.font.familyCode};
          `}
          data-test-subj="investigationEvidenceAddQueryText"
        />
      </EuiFormRow>
      <TitleField
        value={title}
        onChange={setTitle}
        error={titleError}
        placeholder={i18n.TITLE_PLACEHOLDER}
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
QueryForm.displayName = 'QueryForm';
