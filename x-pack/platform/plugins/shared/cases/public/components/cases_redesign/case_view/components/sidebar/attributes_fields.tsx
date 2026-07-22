/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CaseUI } from '../../../../../../common';
import * as redesignI18n from '../../../translations';
import { AssigneesField } from './assignees_field';
import { ParticipantsField } from './participants_field';
import { SeverityField } from './severity_field';
import { CategoryField } from './category_field';
import { TagsField } from './tags_field';
import { useCaseParticipantsData } from './hooks/use_case_participants_data';
import { useAttributesFieldActions } from './hooks/use_attributes_field_actions';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import { useGetCurrentUserProfile } from '../../../../../containers/user_profiles/use_get_current_user_profile';

export interface AttributesFieldsProps {
  caseData: CaseUI;
}

const AttributesFieldsComponent: React.FC<AttributesFieldsProps> = ({ caseData }) => {
  const { euiTheme } = useEuiTheme();
  const groupStyles = useMemo(() => css({ gap: euiTheme.size.m }), [euiTheme]);

  const { permissions } = useCasesContext();
  const { caseAssignmentAuthorized } = useCasesFeatures();
  const { data: currentUserProfile, isFetching: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();
  const { isLoadingCaseUsers, userProfiles, participants } = useCaseParticipantsData({ caseData });

  const {
    onSubmitTags,
    onSubmitCategory,
    onUpdateSeverity,
    onUpdateAssignees,
    isSeverityLoading,
    isTagsLoading,
    isCategoryLoading,
    isAssigneeFieldLoading,
  } = useAttributesFieldActions({ caseData });

  const isLoadingAssigneeData = useMemo(
    () => isAssigneeFieldLoading || isLoadingCaseUsers || isLoadingCurrentUserProfile,
    [isAssigneeFieldLoading, isLoadingCaseUsers, isLoadingCurrentUserProfile]
  );

  return (
    <EuiFlexGroup direction="column" responsive={false} css={groupStyles}>
      {caseAssignmentAuthorized ? (
        <AssigneesField
          title={redesignI18n.ASSIGNED_TITLE}
          dataTestSubj="case-view-assignees-field-panel"
          caseAssignees={caseData.assignees}
          currentUserProfile={currentUserProfile}
          onAssigneesChanged={onUpdateAssignees}
          isLoading={isLoadingAssigneeData}
          userProfiles={userProfiles}
          caseId={caseData.id}
          caseTitle={caseData.title}
        />
      ) : null}
      <SeverityField
        isDisabled={!permissions.update}
        isLoading={isSeverityLoading}
        selectedSeverity={caseData.severity}
        onSeverityChange={onUpdateSeverity}
      />
      {participants != null ? (
        <ParticipantsField
          title={redesignI18n.PARTICIPANTS_TITLE}
          users={participants}
          userProfiles={userProfiles}
          isLoading={isLoadingCaseUsers}
          dataTestSubj="case-view-participants-field-panel"
          caseId={caseData.id}
          caseTitle={caseData.title}
        />
      ) : null}
      <TagsField tags={caseData.tags} onSubmit={onSubmitTags} isLoading={isTagsLoading} />
      <CategoryField
        category={caseData.category}
        onSubmit={onSubmitCategory}
        isLoading={isCategoryLoading}
      />
    </EuiFlexGroup>
  );
};

AttributesFieldsComponent.displayName = 'AttributesFields';

export const AttributesFields = React.memo(AttributesFieldsComponent);
