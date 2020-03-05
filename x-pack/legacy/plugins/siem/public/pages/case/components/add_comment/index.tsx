/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { Form, useForm, UseField } from '../../../../shared_imports';

import { CommentRequest } from '../../../../../../../../plugins/case/common/api';
import { usePostComment } from '../../../../containers/case/use_post_comment';
import { schema } from './schema';
import * as i18n from '../../translations';
import { MarkdownEditorForm } from '../../../../components/markdown_editor/form';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

const initialCommentValue: CommentRequest = {
  comment: '',
};

export const AddComment = React.memo<{
  caseId: string;
}>(({ caseId }) => {
  const { commentData, isLoading, postComment } = usePostComment(caseId);
  const { form } = useForm<CommentRequest>({
    defaultValue: initialCommentValue,
    options: { stripEmptyFields: false },
    schema,
  });

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
