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
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { MAX_DESCRIPTION_LENGTH } from '../../../../common/constants';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { MarkdownEditor, MarkdownRenderer } from '../../../components/markdown_editor';
import { useCasesContext } from '../../../components/cases_context/use_cases_context';
import { getHttpErrorMessage, useUpdateRecord } from '../../hooks';
import { ICONS } from '../../icons';
import { SideCard } from './side_card';
import * as i18n from './translations';

const DISABLED_UI_PLUGINS = ['lens'];

export interface DescriptionCardProps {
  record: InvestigationRecord;
}

/**
 * The case description, written by people. It is the case's own description, so the classic case
 * page shows the same text; the agent's summary is a separate thing shown on the Overview.
 */
export const DescriptionCard: React.FC<DescriptionCardProps> = ({ record }) => {
  const { permissions } = useCasesContext();
  const editorId = useGeneratedHtmlId({ prefix: 'investigationDescriptionEditor' });
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>(undefined);
  const { mutate: updateRecord, isLoading } = useUpdateRecord(record.id, {
    successMessage: i18n.DESCRIPTION_SAVED,
    silentErrors: true,
  });

  const canEdit = permissions.update && !record.merged_into;
  const isEditing = draft !== null;
  const trimmed = draft?.trim() ?? '';
  const validationError =
    isEditing && trimmed.length === 0
      ? i18n.DESCRIPTION_REQUIRED
      : (draft?.length ?? 0) > MAX_DESCRIPTION_LENGTH
      ? i18n.DESCRIPTION_TOO_LONG(MAX_DESCRIPTION_LENGTH)
      : undefined;
  const shownError = error ?? validationError;

  const cancel = () => {
    setDraft(null);
    setError(undefined);
  };

  const save = () => {
    if (draft === null || validationError) {
      return;
    }
    if (draft === record.description) {
      cancel();
      return;
    }
    updateRecord(
      { description: draft },
      {
        onSuccess: cancel,
        onError: (saveError) => setError(getHttpErrorMessage(saveError)),
      }
    );
  };

  return (
    <SideCard
      title={i18n.DESCRIPTION_TITLE}
      action={
        canEdit && !isEditing ? (
          <EuiToolTip content={i18n.DESCRIPTION_EDIT} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={ICONS.edit}
              aria-label={i18n.DESCRIPTION_EDIT}
              onClick={() => setDraft(record.description)}
              data-test-subj="investigationDescriptionEdit"
            />
          </EuiToolTip>
        ) : null
      }
      data-test-subj="investigationDescriptionCard"
    >
      {isEditing ? (
        <>
          <EuiFormRow fullWidth isInvalid={shownError !== undefined} error={shownError}>
            <MarkdownEditor
              ariaLabel={i18n.DESCRIPTION_TITLE}
              editorId={editorId}
              value={draft}
              onChange={(next) => {
                setError(undefined);
                setDraft(next);
              }}
              height={200}
              disabledUiPlugins={DISABLED_UI_PLUGINS}
              errors={shownError ? [shownError] : []}
              data-test-subj="investigationDescriptionEditor"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                onClick={cancel}
                isDisabled={isLoading}
                data-test-subj="investigationDescriptionCancel"
              >
                {i18n.DESCRIPTION_CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                fill
                onClick={save}
                isLoading={isLoading}
                isDisabled={validationError !== undefined}
                data-test-subj="investigationDescriptionSave"
              >
                {i18n.DESCRIPTION_SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : record.description.trim().length > 0 ? (
        <div data-test-subj="investigationDescriptionText">
          <MarkdownRenderer textSize="s">{record.description}</MarkdownRenderer>
        </div>
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="investigationDescriptionEmpty">
          <p>{i18n.DESCRIPTION_EMPTY}</p>
        </EuiText>
      )}
    </SideCard>
  );
};
DescriptionCard.displayName = 'DescriptionCard';
