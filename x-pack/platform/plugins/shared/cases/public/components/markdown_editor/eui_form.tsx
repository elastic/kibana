/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import {
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../common/translations';
import { MarkdownEditor } from './editor';
import { CommentEditorContext } from './context';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';
import { type MarkdownEditorRef } from './types';
import { PastableMarkdownEditor } from './pastable_editor';

/* eslint-disable react/no-unused-prop-types */
type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseId?: string;
  caseTags?: string[];
  draftStorageKey?: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
};

/**
 * It is not guaranteed that downstream consumers of cases will have
 * defined a files context. This hook tests if the context is defined.
 */
function useHasFilesContext(): boolean {
  try {
    return !!useFilesContext();
  } catch {
    return false;
  }
}

export const MarkdownEditorForm = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorFormProps>(
    (
      {
        id,
        field,
        dataTestSubj,
        idAria,
        bottomRightContent,
        caseTitle,
        caseTags,
        caseId,
        draftStorageKey,
        disabledUiPlugins,
        initialValue,
      },
      ref
    ) => {
      // if there is no files context, we don't supply the paste functionality to the comment editor
      const hasFilesContext = useHasFilesContext();

      const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
      const { hasConflicts } = useMarkdownSessionStorage({
        field,
        sessionKey: draftStorageKey ?? '',
        initialValue,
      });
      const { euiTheme } = useEuiTheme();

      const conflictWarningText = i18n.VERSION_CONFLICT_WARNING(
        id === 'description' ? id : 'comment'
      );

      const commentEditorContextValue = useMemo(
        () => ({
          editorId: id,
          value: field.value,
          caseTitle,
          caseTags,
        }),
        [id, field.value, caseTitle, caseTags]
      );

      const editorBaseProps = {
        ariaLabel: idAria,
        'data-test-subj': dataTestSubj,
        editorId: id,
        disabledUiPlugins,
      };

      return (
        <CommentEditorContext.Provider value={commentEditorContextValue}>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={field.helpText}
            isInvalid={isInvalid}
            label={field.label}
            labelAppend={field.labelAppend}
          >
            {hasFilesContext ? (
              <PastableMarkdownEditor
                {...editorBaseProps}
                ref={ref}
                field={field}
                caseId={caseId}
              />
            ) : (
              <MarkdownEditor
                {...editorBaseProps}
                ref={ref}
                onChange={field.setValue}
                value={field.value}
              />
            )}
          </EuiFormRow>
          {bottomRightContent && (
            <EuiFlexGroup
              css={css`
                padding: ${euiTheme.size.m} 0;
              `}
              justifyContent={'flexEnd'}
            >
              <EuiFlexItem grow={false}>
                <EuiText color="danger" size="s">
                  {hasConflicts && conflictWarningText}
                </EuiText>
                <EuiSpacer size="s" />
                {bottomRightContent}
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </CommentEditorContext.Provider>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
