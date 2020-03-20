/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingContent, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { Redirect } from 'react-router-dom';

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
import { SpyRoute } from '../../../../utils/route/spy_routes';
import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { SiemPageName } from '../../../home/types';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';
import { useGetCaseUserActions } from '../../../../containers/case/use_get_case_user_actions';

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
  const [initLoadingData, setInitLoadingData] = useState(true);
  const {
    caseUserActions,
    isLoading: isLoadingUserActions,
    fetchCaseUserActions,
  } = useGetCaseUserActions(caseId);
  const { caseData, isLoading, updateKey, updateCaseProperty } = useUpdateCase(caseId, initialData);

  // Update Fields
  const onUpdateField = useCallback(
    (newUpdateKey: keyof Case, updateValue: Case[keyof Case]) => {
      switch (newUpdateKey) {
        case 'title':
          const titleUpdate = getTypedPayload<string>(updateValue);
          if (titleUpdate.length > 0) {
            updateCaseProperty({
              fetchCaseUserActions,
              updateKey: 'title',
              updateValue: titleUpdate,
            });
          }
          break;
        case 'description':
          const descriptionUpdate = getTypedPayload<string>(updateValue);
          if (descriptionUpdate.length > 0) {
            updateCaseProperty({
              fetchCaseUserActions,
              updateKey: 'description',
              updateValue: descriptionUpdate,
            });
          }
          break;
        case 'tags':
          const tagsUpdate = getTypedPayload<string[]>(updateValue);
          updateCaseProperty({
            fetchCaseUserActions,
            updateKey: 'tags',
            updateValue: tagsUpdate,
          });
          break;
        case 'status':
          const statusUpdate = getTypedPayload<string>(updateValue);
          if (caseData.status !== updateValue) {
            updateCaseProperty({
              fetchCaseUserActions,
              updateKey: 'status',
              updateValue: statusUpdate,
            });
          }
        default:
          return null;
      }
    },
    [fetchCaseUserActions, updateCaseProperty, caseData.status]
  );

  const toggleStatusCase = useCallback(
    e => onUpdateField('status', e.target.checked ? 'open' : 'closed'),
    [onUpdateField]
  );
  const onSubmitTags = useCallback(newTags => onUpdateField('tags', newTags), [onUpdateField]);
  const onSubmitTitle = useCallback(newTitle => onUpdateField('title', newTitle), [onUpdateField]);
  const toggleStatusCase = useCallback(status => onUpdateField('status', status), [onUpdateField]);

  const spyState = useMemo(() => ({ caseTitle: caseData.title }), [caseData.title]);

  const caseStatusData = useMemo(
    () =>
      caseData.status === 'open'
        ? {
            'data-test-subj': 'case-view-createdAt',
            value: caseData.createdAt,
            title: i18n.CASE_OPENED,
            buttonLabel: i18n.CLOSE_CASE,
            status: caseData.status,
            icon: 'folderCheck',
            badgeColor: 'secondary',
            isSelected: false,
          }
        : {
            'data-test-subj': 'case-view-closedAt',
            value: caseData.closedAt,
            title: i18n.CASE_CLOSED,
            buttonLabel: i18n.REOPEN_CASE,
            status: caseData.status,
            icon: 'folderExclamation',
            badgeColor: 'danger',
            isSelected: true,
          },
    [caseData.closedAt, caseData.createdAt, caseData.status]
  );
  const emailContent = useMemo(
    () => ({
      subject: i18n.EMAIL_SUBJECT(caseData.title),
      body: i18n.EMAIL_BODY(caseLink),
    }),
    [caseData.title]
  );

  useEffect(() => {
    if (initLoadingData && !isLoadingUserActions) {
      setInitLoadingData(false);
    }
  }, [initLoadingData, isLoadingUserActions]);

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
              {initLoadingData && <EuiLoadingContent lines={8} />}
              {!initLoadingData && (
                <UserActionTree
                  caseUserActions={caseUserActions}
                  data={caseData}
                  fetchUserActions={fetchCaseUserActions.bind(null, caseData.id)}
                  isLoadingDescription={isLoading && updateKey === 'description'}
                  isLoadingUserActions={isLoadingUserActions}
                  onUpdateField={onUpdateField}
                />
              )}
            </EuiFlexItem>
            <EuiFlexItem grow={2}>
              <UserList
                data-test-subj="case-view-user-list"
                email={emailContent}
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
      <SpyRoute state={spyState} />
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
