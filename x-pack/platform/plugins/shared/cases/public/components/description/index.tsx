/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';

import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import * as i18n from '../user_actions/translations';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import type { EditableMarkdownRefObject, MarkdownEditorRef } from '../markdown_editor';
import { EditableMarkdown, ScrollableMarkdown } from '../markdown_editor';
import type { CaseUI } from '../../containers/types';
import type { OnUpdateFields } from '../case_view/types';
import { schema } from './schema';

const DESCRIPTION_ID = 'description';

export interface DescriptionMarkdownRefObject extends EditableMarkdownRefObject {
  editor: MarkdownEditorRef | null;
}
export interface DescriptionProps {
  caseData: CaseUI;
  isLoadingDescription: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
}

const getFlexGroupCss = ({
  euiTheme,
  isCollapsed,
  hasUnsavedChanges,
}: {
  euiTheme: EuiThemeComputed<{}>;
  isCollapsed: boolean;
  hasUnsavedChanges?: boolean;
}) => css`
  padding: ${euiTheme.size.s};
  align-items: center;
  ${!isCollapsed
    ? css`
        border-bottom: ${euiTheme.border.thin};
        border-radius: none;
      `
    : css`
        background: ${euiTheme.colors.lightestShade};
        border-radius: ${euiTheme.border.radius.medium};
        ${hasUnsavedChanges
          ? css`
              border-bottom-left-radius: 0;
              border-bottom-right-radius: 0;
            `
          : css``}
      `}
`;

const getDraftDescription = (
  applicationId = '',
  caseId: string,
  commentId: string
): string | null => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });

  return sessionStorage.getItem(draftStorageKey);
};

const isCommentRef = (
  ref: EditableMarkdownRefObject | null | undefined
): ref is EditableMarkdownRefObject => {
  const commentRef = ref as EditableMarkdownRefObject;
  return commentRef?.setComment != null;
};

export const Description = ({
  caseData,
  onUpdateField,
  isLoadingDescription,
}: DescriptionProps) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isEditable, setIsEditable] = useState<boolean>(false);

  const descriptionRef = useRef(null);
  const descriptionMarkdownRef = useRef<DescriptionMarkdownRefObject | null>(null);

  const { euiTheme } = useEuiTheme();
  const { permissions, owner } = useCasesContext();

  const {
    clearDraftComment: clearLensDraftComment,
    draftComment: lensDraftComment,
    hasIncomingLensState,
    openLensModal,
  } = useLensDraftComment();

  const handleOnChangeEditable = useCallback(() => {
    clearLensDraftComment();
    setIsEditable(false);
  }, [setIsEditable, clearLensDraftComment]);

  const handleOnSave = useCallback(
    (content: string) => {
      onUpdateField({ key: DESCRIPTION_ID, value: content.trim() });
      setIsEditable(false);
    },
    [onUpdateField, setIsEditable]
  );

  const toggleCollapse = () => setIsCollapsed((oldValue: boolean) => !oldValue);

  const draftDescription = getDraftDescription(owner[0], caseData.id, DESCRIPTION_ID);

  if (
    hasIncomingLensState &&
    lensDraftComment !== null &&
    lensDraftComment?.commentId === DESCRIPTION_ID &&
    !isEditable
  ) {
    setIsEditable(true);
  }

  useEffect(() => {
    if (
      isCommentRef(descriptionMarkdownRef.current) &&
      descriptionMarkdownRef.current.editor?.textarea &&
      lensDraftComment &&
      lensDraftComment.commentId === DESCRIPTION_ID
    ) {
      descriptionMarkdownRef.current.setComment(lensDraftComment.comment);
      if (hasIncomingLensState) {
        openLensModal({ editorRef: descriptionMarkdownRef.current.editor });
      } else {
        clearLensDraftComment();
      }
    }
  }, [clearLensDraftComment, lensDraftComment, hasIncomingLensState, openLensModal]);

  const hasUnsavedChanges = Boolean(
    draftDescription && draftDescription !== caseData.description && !isLoadingDescription
  );

  return isEditable ? (
    <EditableMarkdown
      id="description"
      data-test-subj="description"
      caseId={caseData.id}
      content={caseData.description}
      onChangeEditable={handleOnChangeEditable}
      onSaveContent={handleOnSave}
      editorRef={descriptionRef}
      fieldName="content"
      formSchema={schema}
      ref={descriptionMarkdownRef}
    />
  ) : (
    <EuiPanel paddingSize="none" hasBorder data-test-subj="description">
      <EuiFlexGroup direction="column" gutterSize={isCollapsed ? 'none' : 'm'}>
        <EuiFlexItem>
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            css={getFlexGroupCss({ euiTheme, isCollapsed, hasUnsavedChanges })}
          >
            <EuiFlexItem>
              <EuiText data-test-subj="description-title" size="s">
                {i18n.DESCRIPTION}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
              <EuiFlexItem grow={false}>
                {permissions.update ? (
                  <EuiButtonIcon
                    aria-label={i18n.EDIT_DESCRIPTION}
                    iconType="pencil"
                    onClick={() => setIsEditable(true)}
                    data-test-subj="description-edit-icon"
                  />
                ) : null}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  aria-label={isCollapsed ? i18n.EXPAND_DESCRIPTION : i18n.COLLAPSE_DESCRIPTION}
                  iconType={isCollapsed ? 'unfold' : 'fold'}
                  onClick={toggleCollapse}
                  data-test-subj="description-collapse-icon"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        {!isCollapsed ? (
          <EuiFlexItem
            css={css`
              padding: ${euiTheme.size.s};
              padding-top: 0;

              > div {
                padding: 0;
              }
            `}
          >
            <ScrollableMarkdown content={caseData.description} />
          </EuiFlexItem>
        ) : null}
        {hasUnsavedChanges ? (
          <EuiFlexItem
            css={css`
              border-top: ${euiTheme.border.thin};
              padding: ${euiTheme.size.s};
            `}
          >
            <EuiText color="subdued" size="xs" data-test-subj="description-unsaved-draft">
              {i18n.UNSAVED_DRAFT_DESCRIPTION}
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

Description.displayName = 'Description';
