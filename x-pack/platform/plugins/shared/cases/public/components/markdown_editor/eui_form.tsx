/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiMarkdownEditorProps } from '@elastic/eui';
import {
  EuiFormRow,
  EuiFlexItem,
  EuiFlexGroup,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  EuiProgress,
} from '@elastic/eui';
import type { FieldHook } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { useFilesContext } from '@kbn/shared-ux-file-context';
import {
  type UploadState,
  createUploadState,
  DoneNotification,
} from '@kbn/shared-ux-file-upload/src/upload_state';
import { type FileState } from '@kbn/shared-ux-file-upload';
import { getFieldValidityAndErrorMessage } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from '../../common/translations';
import type { MarkdownEditorRef } from './editor';
import { MarkdownEditor } from './editor';
import { CommentEditorContext } from './context';
import { useMarkdownSessionStorage } from './use_markdown_session_storage';
import { useUploadDone } from '../files/use_upload_done';

/* eslint-disable react/no-unused-prop-types */
type MarkdownEditorFormProps = EuiMarkdownEditorProps & {
  id: string;
  field: FieldHook<string>;
  dataTestSubj: string;
  idAria: string;
  isDisabled?: boolean;
  bottomRightContent?: React.ReactNode;
  caseTitle?: string;
  caseTags?: string[];
  draftStorageKey?: string;
  disabledUiPlugins?: string[];
  initialValue?: string;
};

const context = React.createContext<UploadState | null>(null);

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
        draftStorageKey,
        disabledUiPlugins,
        initialValue,
      },
      ref
    ) => {
      const localRef = useRef(null);
      const [isUploading, setIsUploading] = useState(false);
      const [placeholder, setPlaceholder] = useState(false);
      const [uploadingFile, setUploadingFile] = useState<FileState | null>(null);
      const r = ref || localRef;

      console.log('field.value', field.value);
      const { client } = useFilesContext();
      const kind = client.getFileKind('observabilityFilesCases');
      const uploadState = useMemo(
        () =>
          createUploadState({
            client,
            fileKind: kind,
            allowRepeatedUploads: false,
          }),
        [client]
      );
      const onDone = useUploadDone({
        caseId: '42287124-811e-433e-a59f-89868763e867',
        owner: ['observability'],
        onSuccess: () => {
          console.log('success');
        },
        onFailure: (error) => {
          setIsUploading(false);
          console.error(error);
        },
      });
      console.log('case id', id);
      const cb = (file: { id: string; fileJSON: { name: string; extension: string } }) => {
        console.log('in CB!!!!!!!!!!!!!!!!!!', file, r?.current?.textarea?.value);
        const newText = r?.current?.textarea?.value.replace(
          'uploading...',
          `![${file.fileJSON.name}](/api/files/files/${kind.id}/${file.id}/blob)`
        );
        console.log('replacing with new text', newText);
        field.setValue(newText);

        return true;
      };
      useEffect(() => {
        console.log('use effect ran');
        const subs: any[] = [];
        console.log('DONE OBSERVED', uploadState.done$.observed);
        if (uploadState && !uploadState.done$.observed) {
          console.log('subs created');
          subs.push([
            uploadState.clear$.subscribe((arg) => {
              console.log('CLEAR CALLED', arg);
            }),
            uploadState.files$.subscribe((files) => {
              console.log('FILES CALLED', files);
              if (files.length) setUploadingFile(files[0]);
            }),
            uploadState.done$.subscribe((n) => {
              console.log('DONE CALLED', n);
              if (n.length) cb(n[0]);
              setUploadingFile(null);
              return n && onDone(n);
            }),
            uploadState.error$.subscribe((e) => {
              console.log('ERROR CALLED', e);
              console.error(e);
            }),
            uploadState.uploading$.subscribe((uploading) => {
              setIsUploading(uploading);
              console.log('UPLOADING CALLED', uploading);
            }),
          ]);
        }
        return () => {
          console.log('unsubscribing');
          subs.forEach((s) => {
            if (s.unsubscribe) s.unsubscribe();
          });
        };
      }, [onDone, uploadState]);

      useEffect(() => {
        if (!r?.current?.textarea || uploadingFile === null) return;
        if (!placeholder) {
          const { selectionStart, selectionEnd } = r.current.textarea;
          const text = 'uploading...';
          const before = field.value.slice(0, selectionStart);
          const after = field.value.slice(selectionEnd);
          const newValue = before + text + after;
          field.setValue(newValue);
          setPlaceholder(true);
          console.log('new value', newValue);
        }
      }, [field.value, isUploading, r, placeholder]);
      // const uploadState = createUploadState({
      //   client: {

      //   }
      // });
      const textarea = r?.current?.textarea;
      useEffect(() => {
        if (textarea) {
          console.log('textarea', textarea);
          textarea.addEventListener('paste', (e, d) => {
            console.log('event!!!!!!!!!!!!', e, d);
            console.log('clipboard data', e.clipboardData?.items);
            console.log('clipboard data', e.clipboardData?.items[0]);
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
              const file = item.getAsFile();
              if (file) {
                console.log('file', file);
                uploadState.setFiles([file]);
              }
              if (uploadState.hasFiles())
                uploadState.upload({
                  caseIds: ['42287124-811e-433e-a59f-89868763e867'],
                  owner: 'observability',
                });
              console.log('calling upload!!!');
            }
          });
        }
      }, [textarea, uploadState]);
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

      return (
        <context.Provider value={uploadState}>
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
              <>
                {isUploading && <EuiProgress size="m" />}
                <MarkdownEditor
                  ref={r}
                  ariaLabel={idAria}
                  editorId={id}
                  onChange={(e) => {
                    console.log('onchange', e);
                    field.setValue(e);
                  }}
                  onParse={(err, arg) => {
                    console.log(err, arg);
                  }}
                  value={field.value}
                  disabledUiPlugins={disabledUiPlugins}
                  autoExpandPreview={false}
                  markdownFormatProps={{ classNames: '.test' }}
                  data-test-subj={`${dataTestSubj}-markdown-editor`}
                />
              </>
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
        </context.Provider>
      );
    }
  )
);

MarkdownEditorForm.displayName = 'MarkdownEditorForm';
