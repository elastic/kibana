/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import * as i18n from '../../common/translations';
import { CommentEditorContext } from './context';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';
import type { MarkdownEditorRef, MarkdownValueControl } from './types';
import { CommentEditor } from './comment_editor';

export interface MarkdownEditorLayoutProps {
  id: string;
  control: MarkdownValueControl;
  dataTestSubj: string;
  idAria: string;
  label?: React.ReactNode;
  labelAppend?: React.ReactNode;
  helpText?: React.ReactNode;
  isInvalid: boolean;
  errorMessage: string | null;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseId?: string;
  caseTags?: string[];
  draftStorageKey?: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
  onBlur?: () => void;
}

/** Form-library agnostic markdown editor row; `MarkdownEditorForm` and `MarkdownField` adapt to it. */
export const MarkdownEditorLayout = React.memo(
  forwardRef<MarkdownEditorRef, MarkdownEditorLayoutProps>(
    (
      {
        id,
        control,
        dataTestSubj,
        idAria,
        label,
        labelAppend,
        helpText,
        isInvalid,
        errorMessage,
        bottomRightContent,
        caseTitle,
        caseTags,
        caseId,
        draftStorageKey,
        disabledUiPlugins,
        initialValue,
        onBlur,
      },
      ref
    ) => {
      const { hasConflicts } = useMarkdownSessionStorage({
        field: control,
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
          value: control.value,
          caseTitle,
          caseTags,
        }),
        [id, control.value, caseTitle, caseTags]
      );

      return (
        <CommentEditorContext.Provider value={commentEditorContextValue}>
          <EuiFormRow
            data-test-subj={dataTestSubj}
            describedByIds={idAria ? [idAria] : undefined}
            fullWidth
            error={errorMessage}
            helpText={helpText}
            isInvalid={isInvalid}
            label={label}
            labelAppend={labelAppend}
            onBlur={onBlur}
          >
            <CommentEditor
              ariaLabel={idAria}
              data-test-subj={`${dataTestSubj}-markdown-editor`}
              editorId={id}
              disabledUiPlugins={disabledUiPlugins}
              field={control}
              caseId={caseId}
              ref={ref}
              onChange={control.setValue}
              value={control.value}
            />
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

MarkdownEditorLayout.displayName = 'MarkdownEditorLayout';
