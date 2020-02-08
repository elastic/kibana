/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiDescriptionList,
  EuiButtonToggle,
  EuiBadge,
} from '@elastic/eui';

import styled, { css } from 'styled-components';
import { Markdown } from '../../../../components/markdown';
import { HeaderPage } from '../../../../components/header_page_new';
import { WrapperPage } from '../../../../components/wrapper_page';
import * as i18n from './translations';
import { getCaseUrl } from '../../../../components/link_to';
import { useGetCase } from '../../../../containers/case/use_get_case';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { Form, useForm } from '../shared_imports';
import { schema } from './schema';
import { DescriptionMarkdown } from '../description_md_editor';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { NewCaseFormatted } from '../../../../containers/case/types';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { TagList } from '../tag_list';
import { PropertyActions } from '../property_actions';

interface Props {
  caseId: string;
}

const MyDescriptionList = styled(EuiDescriptionList)`
  ${({ theme }) => css`
    & {
      padding-right: ${theme.eui.euiSizeL};
      border-right: ${theme.eui.euiBorderThin};
    }
  `}
`;

const MyWrapper = styled(WrapperPage)`
  padding-bottom: 0;
  ${({ theme }) => css`
    @media only screen and (min-width: ${theme.eui.euiBreakpoints.l}) {
      margin: 0 auto;
      width: 85%;
    }
  `}
`;
const BackgroundWrapper = styled.div`
  ${({ theme }) => css`
    background-color: ${theme.eui.euiColorEmptyShade};
    border-top: ${theme.eui.euiBorderThin};
    height: 100%;
  `}
`;

export const CaseView = React.memo(({ caseId }: Props) => {
  const [{ data, isLoading, isError }, refreshCase] = useGetCase(caseId);
  if (isError) {
    return null;
  }
  const [setFormData] = useUpdateCase(caseId, data);
  const { form } = useForm({
    defaultValue: data,
    options: { stripEmptyFields: false },
    schema,
  });
  const [isEdit, setIsEdit] = useState(false);
  const [isCaseOpen, setIsCaseOpen] = useState(data.state.toLowerCase() === 'open');

  const onSubmit = useCallback(async () => {
    const { isValid, data: newData } = await form.submit();
    if (isValid) {
      setFormData({ ...newData, isNew: true } as NewCaseFormatted);
      refreshCase(newData as NewCaseFormatted);
      setIsEdit(false);
    }
  }, [form]);
  const propertyActions = [
    {
      iconType: 'documentEdit',
      label: 'Edit description',
      onClick: () => setIsEdit(true),
    },
    {
      iconType: 'securitySignalResolved',
      label: 'Close case',
      onClick: () => null,
    },
    {
      iconType: 'trash',
      label: 'Delete case',
      onClick: () => null,
    },
    {
      iconType: 'importAction',
      label: 'Push as ServiceNow incident',
      onClick: () => null,
    },
    {
      iconType: 'popout',
      label: 'View ServiceNow incident',
      onClick: () => null,
    },
    {
      iconType: 'importAction',
      label: 'Update ServiceNow incident',
      onClick: () => null,
    },
  ];
  const userActions = [
    {
      avatarName: data.created_by.username,
      title: (
        <EuiFlexGroup alignItems="baseline" gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <p>
              <strong>{`${data.created_by.username}`}</strong>
              {` ${i18n.ADDED_DESCRIPTION} `}{' '}
              <FormattedRelativePreferenceDate value={data.created_at} labelOn />
            </p>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PropertyActions propertyActions={propertyActions} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      children: isEdit ? (
        <>
          <DescriptionMarkdown
            descriptionInputHeight={200}
            initialDescription={data.description}
            isLoading={isLoading}
            onChange={description => setFormData({ ...data, description })}
          />

          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
            <EuiFlexItem grow={false}>
              <EuiButton fill isDisabled={isLoading} isLoading={isLoading} onClick={onSubmit}>
                {i18n.SUBMIT}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={() => setIsEdit(false)}>{i18n.CANCEL}</EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <Markdown raw={data.description} />
      ),
    },
    {
      avatarName: `steph`,
      title: (
        <p>
          <strong>{`steph`}</strong>
          {` ${i18n.ADDED_COMMENT} `}{' '}
          <FormattedRelativePreferenceDate value={data.created_at} labelOn />
        </p>
      ),
      children: <p>{'alright alright alright'}</p>,
    },
  ];

  useEffect(() => {
    setIsCaseOpen(data.state.toLowerCase() === 'open');
  }, [data.state]);

  return isLoading ? (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="xl" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <>
      <MyWrapper>
        <HeaderPage
          backOptions={{
            href: getCaseUrl(),
            text: i18n.BACK_TO_ALL,
          }}
          title={data.title}
        >
          <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <MyDescriptionList compressed>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiBadge color={isCaseOpen ? 'secondary' : 'danger'}>{data.state}</EuiBadge>
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>{i18n.CASE_OPENED}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <FormattedRelativePreferenceDate value={data.created_at} />
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </MyDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="l" alignItems="center">
                <EuiFlexItem>
                  <EuiButtonToggle
                    label={isCaseOpen ? 'Close case' : 'Reopen case'}
                    iconType={isCaseOpen ? 'checkInCircleFilled' : 'magnet'}
                    onChange={() => setIsCaseOpen(!isCaseOpen)}
                    isSelected={isCaseOpen}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <PropertyActions propertyActions={propertyActions} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </HeaderPage>
      </MyWrapper>
      <BackgroundWrapper>
        <MyWrapper>
          <EuiFlexGroup>
            <EuiFlexItem grow={6}>
              {isEdit ? (
                <Form form={form}>
                  <UserActionTree userActions={userActions} />
                </Form>
              ) : (
                <UserActionTree userActions={userActions} />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <UserList headline={i18n.REPORTER} users={[data.created_by]} />
              <TagList tags={data.tags} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </MyWrapper>
      </BackgroundWrapper>
    </>
  );
});

CaseView.displayName = 'CaseView';
