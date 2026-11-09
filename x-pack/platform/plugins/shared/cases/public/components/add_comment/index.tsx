/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLoadingSpinner,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { isEmpty } from 'lodash';

import {
  Form,
  useForm,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FILE_SO_TYPE } from '@kbn/files-plugin/common';
import {
  COMMENT_ATTACHMENT_TYPE,
  FILE_ATTACHMENT_TYPE,
} from '../../../common/constants/attachments';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { deleteFileAttachments } from '../../containers/api';
import type { MarkdownEditorRef } from '../markdown_editor';
import { MarkdownEditorForm } from '../markdown_editor';
import { FileTray, useFileTray } from '../markdown_editor/file_tray';
import type { TrayFile } from '../markdown_editor/file_tray';
import { DROP_FILE_HERE } from '../markdown_editor/file_tray/translations';
import { getMarkdownEditorStorageKey, isOwner } from '../markdown_editor/utils';
import { removeItemFromSessionStorage } from '../utils';

import * as i18n from './translations';
import type { AddCommentFormSchema } from './schema';
import { schema } from './schema';
import { InsertTimeline } from '../insert_timeline';
import { useCasesContext } from '../cases_context/use_cases_context';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import type { CaseAttachmentsWithoutOwner } from '../../types';

const initialCommentValue: AddCommentFormSchema = {
  comment: '',
};

const getFileAttachment = (
  { id, fileJSON }: Required<Pick<TrayFile, 'id' | 'fileJSON'>>,
  comment: string
): CaseAttachmentsWithoutOwner[number] => ({
  type: FILE_ATTACHMENT_TYPE,
  attachmentId: id,
  ...(comment.trim().length > 0 ? { data: { content: comment } } : {}),
  metadata: {
    files: [
      {
        name: fileJSON.name,
        extension: fileJSON.extension ?? '',
        mimeType: fileJSON.mimeType ?? '',
        created: fileJSON.created,
      },
    ],
    soType: FILE_SO_TYPE,
  },
});

const getFilesFromDataTransfer = (dataTransfer: DataTransfer | null): File[] =>
  Array.from(dataTransfer?.files ?? []);

export interface AddCommentRefObject {
  addQuote: (quote: string) => void;
  setComment: (newComment: string) => void;
  editor: MarkdownEditorRef | null;
}

export interface AddCommentProps {
  id: string;
  caseId: string;
  onCommentSaving?: () => void;
  onCommentPosted: () => void;
  showLoading?: boolean;
  statusActionButton: JSX.Element | null;
  attachActionButton?: JSX.Element | null;
}

export const AddComment = React.memo(
  forwardRef<AddCommentRefObject, AddCommentProps>(
    (
      {
        id,
        caseId,
        onCommentPosted,
        onCommentSaving,
        showLoading = true,
        statusActionButton,
        attachActionButton,
      },
      ref
    ) => {
      const editorRef = useRef<MarkdownEditorRef>(null);
      const [focusOnContext, setFocusOnContext] = useState(false);
      const { permissions, owner } = useCasesContext();
      const { isLoading, mutate: createAttachments } = useCreateAttachments();
      const { euiTheme } = useEuiTheme();
      const fileTray = useFileTray({ caseId, owner: isOwner(owner[0]) ? owner[0] : null });
      const { trayFile, addFiles, reset: resetFileTray } = fileTray;
      const [isDraggingFile, setIsDraggingFile] = useState(false);
      const draftStorageKey = getMarkdownEditorStorageKey({
        appId: owner[0],
        caseId,
        commentId: id,
      });

      const { form } = useForm<AddCommentFormSchema>({
        defaultValue: initialCommentValue,
        options: { stripEmptyFields: false },
        schema,
      });

      const fieldName = 'comment';
      const { setFieldValue, reset, submit } = form;
      const [{ comment }] = useFormData<{ comment: string }>({ form, watch: [fieldName] });

      const addQuote = useCallback<AddCommentRefObject['addQuote']>(
        (quote) => {
          const addCarrots = quote.replace(new RegExp('\r?\n', 'g'), '\n> ');
          const val = `> ${addCarrots} \n\n`;
          setFieldValue(fieldName, `${comment}${comment.length > 0 ? '\n\n' : ''}${val}`);
          setFocusOnContext(true);
        },
        [comment, setFieldValue]
      );

      const setComment = useCallback<AddCommentRefObject['setComment']>(
        (newComment) => {
          setFieldValue(fieldName, newComment);
        },
        [setFieldValue]
      );

      useImperativeHandle(ref, () => ({
        addQuote,
        setComment,
        editor: editorRef.current,
      }));

      const uploadedFile = useMemo(
        () =>
          trayFile?.status === 'uploaded' && trayFile.id && trayFile.fileJSON
            ? { id: trayFile.id, fileJSON: trayFile.fileJSON }
            : null,
        [trayFile]
      );

      const onSubmit = useCallback(async () => {
        // A file can go out without text, so the empty-comment check only applies without one.
        const { isValid, data } = uploadedFile
          ? { isValid: true, data: { comment: comment ?? '' } }
          : await submit();

        if (isValid) {
          if (onCommentSaving != null) {
            onCommentSaving();
          }

          const attachments: CaseAttachmentsWithoutOwner = uploadedFile
            ? [getFileAttachment(uploadedFile, data.comment)]
            : [{ type: COMMENT_ATTACHMENT_TYPE, data: { content: data.comment } }];

          createAttachments(
            {
              caseId,
              caseOwner: owner[0],
              attachments,
            },
            {
              onSuccess: () => {
                onCommentPosted();
              },
              // The error toast comes from the hook; drop the file so it doesn't linger unattached.
              ...(uploadedFile
                ? {
                    onError: () =>
                      deleteFileAttachments({ caseId, fileIds: [uploadedFile.id] }).catch(() => {}),
                  }
                : {}),
            }
          );

          reset({ defaultValue: {} });
          resetFileTray();
        }

        removeItemFromSessionStorage(draftStorageKey);
      }, [
        uploadedFile,
        comment,
        submit,
        onCommentSaving,
        createAttachments,
        caseId,
        owner,
        onCommentPosted,
        reset,
        resetFileTray,
        draftStorageKey,
      ]);

      /**
       * Focus on the text area when a quote has been added.
       *
       * The useEffect will run only when focusOnContext
       * changes.
       *
       * The useEffect is also called once one mount
       * where the comment is empty. We do not want to focus
       * in this scenario.
       *
       * Ideally we would like to put the
       * editorRef.current?.textarea?.focus(); inside the if (focusOnContext).
       * The reason this is not feasible is because when it sets the
       * focusOnContext to false a render will occur again and the
       * focus will be lost.
       *
       * We do not put the comment in the dependency list
       * because we do not want to focus when the user
       * is typing.
       */

      useEffect(() => {
        if (!isEmpty(comment)) {
          editorRef.current?.textarea?.focus();
        }

        if (focusOnContext) {
          setFocusOnContext(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [focusOnContext]);

      // A file still uploading or rejected blocks sending until it finishes or is removed.
      const hasPendingFile = trayFile != null && uploadedFile == null;
      const commentLength = comment?.trim().length ?? 0;
      const isDisabled =
        isLoading ||
        hasPendingFile ||
        (!uploadedFile && commentLength === 0) ||
        commentLength > MAX_COMMENT_LENGTH;

      const onPaste = useCallback(
        (event: React.ClipboardEvent<HTMLDivElement>) => {
          const files = getFilesFromDataTransfer(event.clipboardData);
          if (!fileTray.isEnabled || files.length === 0) return;
          event.preventDefault();
          addFiles(files);
        },
        [addFiles, fileTray.isEnabled]
      );

      const onDragOver = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
          if (!fileTray.isEnabled || !event.dataTransfer.types.includes('Files')) return;
          event.preventDefault();
          setIsDraggingFile(true);
        },
        [fileTray.isEnabled]
      );

      const onDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDraggingFile(false);
        }
      }, []);

      const onDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
          setIsDraggingFile(false);
          const files = getFilesFromDataTransfer(event.dataTransfer);
          if (!fileTray.isEnabled || files.length === 0) return;
          event.preventDefault();
          addFiles(files);
        },
        [addFiles, fileTray.isEnabled]
      );

      const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
          const modifierPressed = event.ctrlKey || event.metaKey;
          const isEnter = event.key === 'Enter' || event.key === 'NumpadEnter';
          if (!isDisabled && isEnter && modifierPressed) {
            event.preventDefault();
            onSubmit();
          }
        },
        [onSubmit, isDisabled]
      );

      useEffect(() => {
        const textarea = editorRef.current?.textarea;
        if (!textarea) {
          return;
        }
        textarea.addEventListener('keydown', handleKeyDown);

        return () => {
          textarea.removeEventListener('keydown', handleKeyDown);
        };
      }, [handleKeyDown]);

      return (
        <span id="add-comment-permLink">
          {isLoading && showLoading && (
            <EuiLoadingSpinner
              css={css`
                position: absolute;
                top: 50%;
                left: 50%;
              `}
              data-test-subj="loading-spinner"
              size="xl"
            />
          )}
          {permissions.createComment && (
            <Form form={form} data-test-subj="add-comment-form-wrapper">
              <div
                onPaste={onPaste}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                css={
                  isDraggingFile &&
                  css`
                    outline: ${euiTheme.border.width.thick} dashed ${euiTheme.colors.primary};
                    outline-offset: ${euiTheme.size.xs};
                    border-radius: ${euiTheme.border.radius.medium};
                  `
                }
                data-test-subj="add-comment-drop-zone"
              >
                <UseField
                  path={fieldName}
                  component={MarkdownEditorForm}
                  componentProps={{
                    ref: editorRef,
                    id,
                    draftStorageKey,
                    caseId,
                    idAria: 'caseComment',
                    isDisabled: isLoading,
                    dataTestSubj: 'add-comment',
                    placeholder: i18n.ADD_COMMENT_HELP_TEXT,
                    disablePasteUpload: fileTray.isEnabled,
                    belowEditorContent: isDraggingFile ? (
                      <EuiText size="xs" color="subdued" data-test-subj="add-comment-drop-hint">
                        {DROP_FILE_HERE}
                      </EuiText>
                    ) : (
                      <FileTray
                        trayFile={trayFile}
                        trayError={fileTray.trayError}
                        onRemove={fileTray.removeFile}
                      />
                    ),
                    bottomRightContent: (
                      <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false} wrap>
                        {statusActionButton && (
                          <EuiFlexItem grow={false}>{statusActionButton}</EuiFlexItem>
                        )}
                        {attachActionButton && (
                          <EuiFlexItem grow={false}>{attachActionButton}</EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>
                          <EuiButton
                            data-test-subj="submit-comment"
                            fill
                            iconType="plusCircle"
                            isDisabled={isDisabled}
                            isLoading={isLoading}
                            onClick={onSubmit}
                          >
                            {i18n.ADD_COMMENT}
                          </EuiButton>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    ),
                  }}
                />
              </div>
              <InsertTimeline fieldName="comment" />
            </Form>
          )}
        </span>
      );
    }
  )
);

AddComment.displayName = 'AddComment';
