/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { MAX_COMMENT_LENGTH } from '../../../../common/constants';
import { usePostReply } from '../../../containers/threads/hooks';
import type { MarkdownEditorRef } from '../../markdown_editor';
import { MarkdownEditor } from '../../markdown_editor';
import { MentionAutocomplete } from '../../markdown_editor/mention';
import * as i18n from './translations';

const REPLY_EDITOR_HEIGHT = 80;

export interface ReplyComposerProps {
  caseId: string;
  parentId: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

export const ReplyComposer: React.FC<ReplyComposerProps> = ({
  caseId,
  parentId,
  autoFocus = false,
  onCancel,
}) => {
  const [content, setContent] = useState('');
  const editorRef = useRef<MarkdownEditorRef>(null);
  const getTextarea = useCallback(() => editorRef.current?.textarea, []);
  const { mutate: postReply, isLoading } = usePostReply();

  useEffect(() => {
    if (autoFocus) {
      editorRef.current?.textarea?.focus();
    }
  }, [autoFocus]);

  const length = content.trim().length;
  const isDisabled = isLoading || length === 0 || length > MAX_COMMENT_LENGTH;

  const onSend = useCallback(() => {
    if (isDisabled) {
      return;
    }
    postReply({ caseId, parentId, content }, { onSuccess: () => setContent('') });
  }, [caseId, content, isDisabled, parentId, postReply]);

  useEffect(() => {
    const textarea = editorRef.current?.textarea;
    if (textarea == null) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        onSend();
      }
    };

    textarea.addEventListener('keydown', onKeyDown);
    return () => textarea.removeEventListener('keydown', onKeyDown);
  }, [onSend]);

  return (
    <div data-test-subj={`reply-composer-${parentId}`}>
      <MentionAutocomplete value={content} onChange={setContent} getTextarea={getTextarea}>
        <MarkdownEditor
          ref={editorRef}
          ariaLabel={i18n.REPLY_ARIA_LABEL}
          editorId={`reply-${parentId}`}
          data-test-subj={`reply-editor-${parentId}`}
          value={content}
          onChange={setContent}
          height={REPLY_EDITOR_HEIGHT}
          placeholder={i18n.REPLY_PLACEHOLDER}
        />
      </MentionAutocomplete>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
        {onCancel != null ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={onCancel} data-test-subj="reply-composer-cancel">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            fill
            onClick={onSend}
            isDisabled={isDisabled}
            isLoading={isLoading}
            data-test-subj="reply-composer-send"
          >
            {i18n.SEND_REPLY}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

ReplyComposer.displayName = 'ReplyComposer';
