/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

import styled from 'styled-components';
import * as i18n from './translations';
import { Case } from '../../../../containers/case/types';
import { getCaseUrl } from '../../../../components/link_to';
import { HeaderPage } from '../../../../components/header_page';
import { EditableTitle } from '../../../../components/header_page/editable_title';
import { TagList } from '../tag_list';
import { useGetCase } from '../../../../containers/case/use_get_case';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { WrapperPage } from '../../../../components/wrapper_page';
import { getTypedPayload } from '../../../../containers/case/utils';
import { WhitePageWrapper } from '../wrappers';
import { useBasePath } from '../../../../lib/kibana';
import { CaseStatus } from '../case_status';

interface Props {
  caseId: string;
}

const MyWrapper = styled(WrapperPage)`
  padding-bottom: 0;
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export interface CaseProps {
  caseId: string;
  initialData: Case;
}

export const CaseComponent = React.memo<CaseProps>(({ caseId, initialData }) => {
  const basePath = window.location.origin + useBasePath();
  const caseLink = `${basePath}/app/siem#/case/${caseId}`;
  const { caseData, isLoading, updateKey, updateCaseProperty } = useUpdateCase(caseId, initialData);

  // Update Fields
  const onUpdateField = useCallback(
    (newUpdateKey: keyof Case, updateValue: Case[keyof Case]) => {
      switch (newUpdateKey) {
        case 'title':
          const titleUpdate = getTypedPayload<string>(updateValue);
          if (titleUpdate.length > 0) {
            updateCaseProperty({
              updateKey: 'title',
              updateValue: titleUpdate,
            });
          }
          break;
        case 'description':
          const descriptionUpdate = getTypedPayload<string>(updateValue);
          if (descriptionUpdate.length > 0) {
            updateCaseProperty({
              updateKey: 'description',
              updateValue: descriptionUpdate,
            });
          }
          break;
        case 'tags':
          const tagsUpdate = getTypedPayload<string[]>(updateValue);
          updateCaseProperty({
            updateKey: 'tags',
            updateValue: tagsUpdate,
          });
          break;
        case 'status':
          const statusUpdate = getTypedPayload<string>(updateValue);
          if (caseData.status !== updateValue) {
            updateCaseProperty({
              updateKey: 'status',
              updateValue: statusUpdate,
            });
          }
        default:
          return null;
      }
    },
    [caseData.status]
  );
  const onSubmitTags = useCallback(newTags => onUpdateField('tags', newTags), [onUpdateField]);
  const onSubmitTitle = useCallback(newTitle => onUpdateField('title', newTitle), [onUpdateField]);
  const toggleStatusCase = useCallback(status => onUpdateField('status', status), [onUpdateField]);

  const caseStatusData = useMemo(
    () =>
      caseData.status === 'open'
        ? {
            'data-test-subj': 'case-view-createdAt',
            value: caseData.createdAt,
            title: i18n.CASE_OPENED,
            buttonLabel: i18n.CLOSE_CASE,
            status: caseData.status,
            icon: 'checkInCircleFilled',
            badgeColor: 'secondary',
            isSelected: false,
          }
        : {
            'data-test-subj': 'case-view-closedAt',
            value: caseData.closedAt,
            title: i18n.CASE_CLOSED,
            buttonLabel: i18n.REOPEN_CASE,
            status: caseData.status,
            icon: 'magnet',
            badgeColor: 'danger',
            isSelected: true,
          },
    [caseData.closedAt, caseData.createdAt, caseData.status]
  );
  return (
    <>
      <MyWrapper>
        <HeaderPage
          backOptions={{
            href: getCaseUrl(),
            text: i18n.BACK_TO_ALL,
          }}
          data-test-subj="case-view-title"
          titleNode={
            <EditableTitle
              isLoading={isLoading && updateKey === 'title'}
              title={caseData.title}
              onSubmit={onSubmitTitle}
            />
          }
          title={caseData.title}
        >
          <CaseStatus
            caseId={caseData.id}
            caseTitle={caseData.title}
            isLoading={isLoading && updateKey === 'status'}
            toggleStatusCase={toggleStatusCase}
            {...caseStatusData}
          />
        </HeaderPage>
      </MyWrapper>
      <WhitePageWrapper>
        <MyWrapper>
          <EuiFlexGroup>
            <EuiFlexItem grow={6}>
              <UserActionTree
                data={caseData}
                isLoadingDescription={isLoading && updateKey === 'description'}
                onUpdateField={onUpdateField}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <UserList
                data-test-subj="case-view-user-list"
                email={{
                  subject: i18n.EMAIL_SUBJECT(caseData.title),
                  body: i18n.EMAIL_BODY(caseLink),
                }}
                headline={i18n.REPORTER}
                users={[caseData.createdBy]}
              />
              <TagList
                data-test-subj="case-view-tag-list"
                tags={caseData.tags}
                onSubmit={onSubmitTags}
                isLoading={isLoading && updateKey === 'tags'}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </MyWrapper>
      </WhitePageWrapper>
    </>
  );
});

export const CaseView = React.memo(({ caseId }: Props) => {
  const { data, isLoading, isError } = useGetCase(caseId);
  if (isError) {
    return null;
  }
  if (isLoading) {
    return (
      <MyEuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="xl" />
        </EuiFlexItem>
      </MyEuiFlexGroup>
    );
  }

  return <CaseComponent caseId={caseId} initialData={data} />;
});

CaseComponent.displayName = 'CaseComponent';
CaseView.displayName = 'CaseView';
