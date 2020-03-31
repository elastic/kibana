/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
} from '@elastic/eui';
import styled, { css } from 'styled-components';
import { Redirect } from 'react-router-dom';

import { CasePostRequest } from '../../../../../../../../plugins/case/common/api';
import { Field, Form, getUseField, useForm, UseField } from '../../../../shared_imports';
import { usePostCase } from '../../../../containers/case/use_post_case';
import { schema } from './schema';
import { InsertTimelinePopover } from '../../../../components/timeline/insert_timeline_popover';
import { useInsertTimeline } from '../../../../components/timeline/insert_timeline_popover/use_insert_timeline';
import * as i18n from '../../translations';
import { SiemPageName } from '../../../home/types';
import { MarkdownEditorForm } from '../../../../components/markdown_editor/form';

export const CommonUseField = getUseField({ component: Field });

const ContainerBig = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSizeXL};
  `}
`;

const Container = styled.div`
  ${({ theme }) => css`
    margin-top: ${theme.eui.euiSize};
  `}
`;
const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 99;
`;

const initialCaseValue: CasePostRequest = {
  description: '',
  tags: [],
  title: '',
};

export const Create = React.memo(() => {
  const { caseData, isLoading, postCase } = usePostCase();
  const [isCancel, setIsCancel] = useState(false);
  const { form } = useForm<CasePostRequest>({
    defaultValue: initialCaseValue,
    options: { stripEmptyFields: false },
    schema,
  });
  const { handleCursorChange, handleOnTimelineChange } = useInsertTimeline<CasePostRequest>(
    form,
    'description'
  );

  const onSubmit = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      await postCase(data);
    }
  }, [form]);

  const handleSetIsCancel = useCallback(() => {
    setIsCancel(true);
  }, [isCancel]);

  if (caseData != null && caseData.id) {
    return <Redirect to={`/${SiemPageName.case}/${caseData.id}`} />;
  }

  if (isCancel) {
    return <Redirect to={`/${SiemPageName.case}`} />;
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
              disabled: isLoading,
            },
          }}
        />
        <Container>
          <CommonUseField
            path="tags"
            componentProps={{
              idAria: 'caseTags',
              'data-test-subj': 'caseTags',
              euiFieldProps: {
                fullWidth: true,
                placeholder: '',
                isDisabled: isLoading,
              },
            }}
          />
        </Container>
        <ContainerBig>
          <UseField
            path="description"
            component={MarkdownEditorForm}
            componentProps={{
              dataTestSubj: 'caseDescription',
              idAria: 'caseDescription',
              isDisabled: isLoading,
              onCursorPositionUpdate: handleCursorChange,
              topRightContent: (
                <InsertTimelinePopover
                  hideUntitled={true}
                  isDisabled={isLoading}
                  onTimelineChange={handleOnTimelineChange}
                />
              ),
            }}
          />
        </ContainerBig>
      </Form>
      <Container>
        <EuiFlexGroup
          alignItems="center"
          justifyContent="flexEnd"
          gutterSize="xs"
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="create-case-cancel"
              size="s"
              onClick={handleSetIsCancel}
              iconType="cross"
            >
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="plusInCircle"
              isDisabled={isLoading}
              isLoading={isLoading}
              onClick={onSubmit}
            >
              {i18n.CREATE_CASE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Container>
    </EuiPanel>
  );
});

Create.displayName = 'Create';
