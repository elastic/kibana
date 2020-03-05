/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { Form, useForm, UseField } from '../../../../shared_imports';
import { NewComment } from '../../../../containers/case/types';
import { usePostComment } from '../../../../containers/case/use_post_comment';
import { schema } from './schema';
import * as i18n from '../../translations';
import { MarkdownEditorForm } from '../../../../components/markdown_editor/form';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

export const AddComment = React.memo<{
  caseId: string;
}>(({ caseId }) => {
  const [{ data, isLoading, newComment }, setFormData] = usePostComment(caseId);
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid && newData.comment) {
      setFormData({ ...newData, isNew: true } as NewComment);
    } else if (isValid && data.comment) {
      setFormData({ ...data, ...newData, isNew: true } as NewComment);
    }
  }, [form, data]);

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
      {newComment &&
        'TO DO new comment got added but we didnt update the UI yet. Refresh the page to see your comment ;)'}
    </>
  );
});

AddComment.displayName = 'AddComment';
