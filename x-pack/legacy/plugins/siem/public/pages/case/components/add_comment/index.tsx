/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
} from '@elastic/eui';
import styled from 'styled-components';
import { Form, useForm } from '../../../shared_imports';
import { NewComment } from '../../../../containers/case/types';
import { usePostComment } from '../../../../containers/case/use_post_comment';
import { schema } from './schema';
import * as i18n from '../../translations';
import { DescriptionMarkdown } from '../description_md_editor';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

export const AddComment = React.memo<{
  caseId: string;
}>(({ caseId }) => {
  const [{ data, isLoading }, setFormData] = usePostComment(caseId);
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid) {
      setFormData({ ...newData, isNew: true } as NewComment);
    }
  }, [form]);

  return (
    <>
      {isLoading && <MySpinner size="xl" />}
      <Form form={form}>
        <DescriptionMarkdown
          descriptionInputHeight={200}
          fieldName="comment"
          formHook={true}
          initialDescription={data.comment}
          isLoading={isLoading}
          onChange={comment => setFormData({ ...data, comment })}
        />
      </Form>
      <>
        <EuiHorizontalRule margin="m" />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButton fill isDisabled={isLoading} isLoading={isLoading} onClick={onSubmit}>
              {i18n.SUBMIT}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    </>
  );
});

AddComment.displayName = 'AddComment';
