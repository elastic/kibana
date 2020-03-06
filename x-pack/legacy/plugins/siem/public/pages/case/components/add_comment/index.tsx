/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useState } from 'react';
import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';

import { CommentRequest } from '../../../../../../../../plugins/case/common/api';
import { usePostComment } from '../../../../containers/case/use_post_comment';
import { MarkdownEditorForm } from '../../../../components/markdown_editor/form';
import { Form, useForm, UseField } from '../../../../shared_imports';
import * as i18n from '../../translations';
import { schema } from './schema';
import { SearchTimelinePopover } from '../../../../components/timeline/search_super_select_insert';

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
  const [timelineId, setTimelineId] = useState<string | null>(null);
  const [timelineTitle, setTimelineTitle] = useState<string | null>(null);
  const handleOnTimelineChange = useCallback((title: string, id: string | null) => {
    setTimelineId(id);
    setTimelineTitle(title);
    console.log('now what??', id);
    console.log('now what??', title);
    const builtLink = `https://kibana.siem.estc.dev/app/siem#/timelines?timeline=(id:${id},isOpen:!t)`;
  }, []);
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
            bottomRightContent: (
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
            topRightContent: (
              <SearchTimelinePopover
                hideUntitled={true}
                isDisabled={isLoading}
                onTimelineChange={handleOnTimelineChange}
                timelineId={timelineId}
                timelineTitle={timelineTitle}
              />
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
