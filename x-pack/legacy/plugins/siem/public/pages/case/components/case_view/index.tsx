/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonToggle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';

import styled, { css } from 'styled-components';
import { Redirect } from 'react-router-dom';
import * as i18n from './translations';
import { Case } from '../../../../containers/case/types';
import { FormattedRelativePreferenceDate } from '../../../../components/formatted_date';
import { getCaseUrl } from '../../../../components/link_to';
import { HeaderPage } from '../../../../components/header_page';
import { EditableTitle } from '../../../../components/header_page/editable_title';
import { PropertyActions } from '../property_actions';
import { TagList } from '../tag_list';
import { useGetCase } from '../../../../containers/case/use_get_case';
import { UserActionTree } from '../user_action_tree';
import { UserList } from '../user_list';
import { useUpdateCase } from '../../../../containers/case/use_update_case';
import { WrapperPage } from '../../../../components/wrapper_page';
import { getTypedPayload } from '../../../../containers/case/utils';
import { WhitePageWrapper } from '../wrappers';
import { useDeleteCases } from '../../../../containers/case/use_delete_cases';
import { SiemPageName } from '../../../home/types';
import { ConfirmDeleteCaseModal } from '../confirm_delete_case';

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
`;

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  height: 100%;
`;

export interface CaseProps {
  caseId: string;
  initialData: Case;
}

export const CaseComponent = React.memo<CaseProps>(({ caseId, initialData }) => {
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
    [updateCaseProperty, caseData.status]
  );
  const toggleStatusCase = useCallback(
    e => onUpdateField('status', e.target.checked ? 'open' : 'closed'),
    [onUpdateField]
  );
  const onSubmitTitle = useCallback(newTitle => onUpdateField('title', newTitle), [onUpdateField]);
  const onSubmitTags = useCallback(newTags => onUpdateField('tags', newTags), [onUpdateField]);

  // Delete case
  const {
    handleToggleModal,
    handleOnDeleteConfirm,
    isDeleted,
    isDisplayConfirmDeleteModal,
  } = useDeleteCases();

  const confirmDeleteModal = useMemo(
    () => (
      <ConfirmDeleteCaseModal
        caseTitle={caseData.title}
        isModalVisible={isDisplayConfirmDeleteModal}
        isPlural={false}
        onCancel={handleToggleModal}
        onConfirm={handleOnDeleteConfirm.bind(null, [caseId])}
      />
    ),
    [isDisplayConfirmDeleteModal]
  );
  // TO DO refactor each of these const's into their own components
  const propertyActions = [
    {
      iconType: 'trash',
      label: 'Delete case',
      onClick: handleToggleModal,
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

  if (isDeleted) {
    return <Redirect to={`/${SiemPageName.case}`} />;
  }

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
          <EuiFlexGroup gutterSize="l" justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <MyDescriptionList compressed>
                <EuiFlexGroup>
                  <EuiFlexItem grow={false}>
                    <EuiDescriptionListTitle>{i18n.STATUS}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <EuiBadge
                        color={caseData.status === 'open' ? 'secondary' : 'danger'}
                        data-test-subj="case-view-status"
                      >
                        {caseData.status}
                      </EuiBadge>
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiDescriptionListTitle>{i18n.CASE_OPENED}</EuiDescriptionListTitle>
                    <EuiDescriptionListDescription>
                      <FormattedRelativePreferenceDate
                        data-test-subj="case-view-createdAt"
                        value={caseData.createdAt}
                      />
                    </EuiDescriptionListDescription>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </MyDescriptionList>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="l" alignItems="center">
                <EuiFlexItem>
                  <EuiButtonToggle
                    data-test-subj="toggle-case-status"
                    iconType={caseData.status === 'open' ? 'checkInCircleFilled' : 'magnet'}
                    isLoading={isLoading && updateKey === 'status'}
                    isSelected={caseData.status === 'open'}
                    label={caseData.status === 'open' ? 'Close case' : 'Reopen case'}
                    onChange={toggleStatusCase}
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
      {confirmDeleteModal}
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

CaseView.displayName = 'CaseView';
