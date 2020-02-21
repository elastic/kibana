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
  EuiPanel,
} from '@elastic/eui';
import styled from 'styled-components';
import { Redirect } from 'react-router-dom';
import { Field, Form, getUseField, useForm } from '../../../shared_imports';
import { NewCase } from '../../../../containers/case/types';
import { usePostCase } from '../../../../containers/case/use_post_case';
import { schema } from './schema';
import * as i18n from '../../translations';
import { SiemPageName } from '../../../home/types';
import { DescriptionMarkdown } from '../description_md_editor';

export const CommonUseField = getUseField({ component: Field });

const TagContainer = styled.div`
  margin-top: 16px;
`;
const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

export const Create = React.memo(() => {
  const [{ data, isLoading, newCase }, setFormData] = usePostCase();
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid) {
      setFormData({ ...newData, isNew: true } as NewCase);
    }
  }, [form]);

  if (newCase && newCase.case_id) {
    return <Redirect to={`/${SiemPageName.case}/${newCase.case_id}`} />;
  }
  return (
    <EuiPanel>
      {isLoading && <MySpinner size="xl" />}
      <Form form={form}>
        <CommonUseField
          path="title"
          componentProps={{
            idAria: 'caseTitle',
            'data-test-subj': 'caseTitle',
            euiFieldProps: {
              fullWidth: false,
            },
            isDisabled: isLoading,
          }}
        />
        <DescriptionMarkdown
          descriptionInputHeight={200}
          formHook={true}
          initialDescription={data.description}
          isLoading={isLoading}
          onChange={description => setFormData({ ...data, description })}
        />
        <TagContainer>
          <CommonUseField
            path="tags"
            componentProps={{
              idAria: 'caseTags',
              'data-test-subj': 'caseTags',
              euiFieldProps: {
                fullWidth: true,
                placeholder: '',
              },
              isDisabled: isLoading,
            }}
          />
        </TagContainer>
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
    </EuiPanel>
  );
});

Create.displayName = 'Create';
