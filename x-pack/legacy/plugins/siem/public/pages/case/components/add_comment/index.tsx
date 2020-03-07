/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { CommentRequest } from '../../../../../../../../plugins/case/common/api';
import { usePostComment } from '../../../../containers/case/use_post_comment';
import { MarkdownEditorForm } from '../../../../components/markdown_editor/form';
import { Form, useForm, UseField } from '../../../../shared_imports';
import * as i18n from '../../translations';
import { schema } from './schema';
import { Comment } from '../../../../containers/case/types';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

const initialCommentValue: CommentRequest = {
  comment: '',
};

interface AddCommentProps {
  caseId: string;
  onCommentPosted: (commentResponse: Comment) => void;
}

export const AddComment = React.memo<AddCommentProps>(({ caseId, onCommentPosted }) => {
  const { commentData, isLoading, postComment, resetCommentData } = usePostComment(caseId);
  const { form } = useForm<CommentRequest>({
    defaultValue: initialCommentValue,
    options: { stripEmptyFields: false },
    schema,
  });

  useEffect(() => {
    if (commentData !== null) {
      onCommentPosted(commentData);
      form.reset();
      resetCommentData();
    }
  }, [commentData]);

  const onSubmit = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      await postComment(data);
    }
  }, [form]);

  return (
    <>
      {isLoading && <MySpinner size="xl" />}
      <Form form={form}>
        <UseField
          path="comment"
          component={MarkdownEditorForm}
          componentProps={{
            idAria: 'caseComment',
            isDisabled: isLoading,
            dataTestSubj: 'caseComment',
            placeholder: i18n.ADD_COMMENT_HELP_TEXT,
            footerContentRight: (
              <EuiButton
                iconType="plusInCircle"
                isDisabled={isLoading}
                isLoading={isLoading}
                onClick={onSubmit}
                size="s"
              >
                {i18n.ADD_COMMENT}
              </EuiButton>
            ),
          }}
        />
      </Form>
      {commentData != null &&
        'TO DO new comment got added but we didnt update the UI yet. Refresh the page to see your comment ;)'}
    </>
  );
});

AddComment.displayName = 'AddComment';
