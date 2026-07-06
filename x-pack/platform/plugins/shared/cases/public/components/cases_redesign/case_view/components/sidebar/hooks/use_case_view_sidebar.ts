/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { isEqual } from 'lodash';
import type { CaseSeverity, CaseUI } from '../../../../../../../common';
import type { CaseUICustomField } from '../../../../../../../common/ui/types';
import { useGetCaseConfiguration } from '../../../../../../containers/configure/use_get_case_configuration';
import { useGetCaseUsers } from '../../../../../../containers/use_get_case_users';
import { useGetCaseConnectors } from '../../../../../../containers/use_get_case_connectors';
import { useCasesFeatures } from '../../../../../../common/use_cases_features';
import { useGetCurrentUserProfile } from '../../../../../../containers/user_profiles/use_get_current_user_profile';
import { useGetSupportedActionConnectors } from '../../../../../../containers/configure/use_get_supported_action_connectors';
import type { EditConnectorProps } from '../../../../../edit_connector';
import { useOnUpdateField } from '../../../../../case_view/use_on_update_field';
import { useCasesContext } from '../../../../../cases_context/use_cases_context';
import type { Assignee } from '../../../../../user_profiles/types';
import { parseCaseUsers } from '../../../../../utils';
import { useReplaceCustomField } from '../../../../../../containers/use_replace_custom_field';
import { KibanaServices } from '../../../../../../common/lib/kibana';
import { useGetTemplate } from '../../../../../templates_v2/hooks/use_get_template';
import * as redesignI18n from '../../../../translations';
import { useSidebarAccordionsState } from './use_sidebar_accordions_state';
import { isFieldUpdating, getIsLoadingAssigneeData } from '../utils/sidebar_helpers';

export const useCaseViewSidebar = ({ caseData }: { caseData: CaseUI }) => {
  const { permissions } = useCasesContext();
  const { caseAssignmentAuthorized, pushToServiceAuthorized } = useCasesFeatures();
  const { isOpen, onToggle } = useSidebarAccordionsState();

  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { data: caseUsers, isLoading: isLoadingCaseUsers } = useGetCaseUsers(caseData.id);
  const { data: casesConfiguration } = useGetCaseConfiguration();
  const { data: currentUserProfile, isFetching: isLoadingCurrentUserProfile } =
    useGetCurrentUserProfile();
  const { isLoading: isLoadingAllAvailableConnectors, data: supportedActionConnectors } =
    useGetSupportedActionConnectors();
  const { isLoading: isUpdatingCustomField, mutate: replaceCustomField } = useReplaceCustomField();
  const { data: templateData } = useGetTemplate(caseData.template?.id, caseData.template?.version);

  const isTemplatesV2Enabled = KibanaServices.getConfig()?.templates?.enabled ?? false;

  const { userProfiles } = parseCaseUsers({
    caseUsers,
    createdBy: caseData.createdBy,
  });

  const assigneeUids = caseData.assignees.map((assignee) => assignee.uid);

  const { onUpdateField, isLoading, loadingKey } = useOnUpdateField({ caseData });

  const isLoadingAssigneeData = getIsLoadingAssigneeData(
    isLoading,
    loadingKey,
    isLoadingCaseUsers,
    isLoadingCurrentUserProfile
  );

  const onSubmitTags = useCallback(
    (newTags: string[]) => onUpdateField({ key: 'tags', value: newTags }),
    [onUpdateField]
  );

  const onSubmitCategory = useCallback(
    (newCategory: string | null) => onUpdateField({ key: 'category', value: newCategory }),
    [onUpdateField]
  );

  const onUpdateSeverity = useCallback(
    (newSeverity: CaseSeverity) => onUpdateField({ key: 'severity', value: newSeverity }),
    [onUpdateField]
  );

  const onUpdateAssignees = useCallback(
    (newAssignees: Assignee[]) => {
      const newAssigneeUids = newAssignees.map((assignee) => ({ uid: assignee.uid }));
      const newUids = newAssignees.map((assignee) => assignee.uid);
      if (!isEqual([...newUids].sort(), [...assigneeUids].sort())) {
        onUpdateField({ key: 'assignees', value: newAssigneeUids });
      }
    },
    [assigneeUids, onUpdateField]
  );

  const onSubmitConnector = useCallback<EditConnectorProps['onSubmit']>(
    (connector) => {
      onUpdateField({ key: 'connector', value: connector });
    },
    [onUpdateField]
  );

  const onSubmitCustomField = useCallback(
    (customField: CaseUICustomField) => {
      replaceCustomField({
        caseId: caseData.id,
        customFieldId: customField.key,
        customFieldValue: customField.value,
        caseVersion: caseData.version,
        caseData,
      });
    },
    [replaceCustomField, caseData]
  );

  const templateFieldsTitle = templateData?.name ?? redesignI18n.TEMPLATE_FIELDS_TITLE;

  const participants =
    caseUsers != null ? [...caseUsers.participants, ...caseUsers.assignees] : undefined;

  return {
    permissions,
    caseAssignmentAuthorized,
    pushToServiceAuthorized,
    isOpen,
    onToggle,
    caseConnectors,
    casesConfiguration,
    currentUserProfile,
    userProfiles,
    participants,
    supportedActionConnectors,
    isTemplatesV2Enabled,
    templateFieldsTitle,
    onUpdateField,
    onSubmitTags,
    onSubmitCategory,
    onUpdateSeverity,
    onUpdateAssignees,
    onSubmitConnector,
    onSubmitCustomField,
    isLoadingCaseUsers,
    isLoadingAssigneeData,
    isSeverityLoading: isFieldUpdating(isLoading, loadingKey, 'severity'),
    isTagsLoading: isFieldUpdating(isLoading, loadingKey, 'tags'),
    isCategoryLoading: isFieldUpdating(isLoading, loadingKey, 'category'),
    isCustomFieldsLoading:
      isFieldUpdating(isLoading, loadingKey, 'customFields') || isUpdatingCustomField,
    isConnectorLoading:
      isLoadingAllAvailableConnectors || isFieldUpdating(isLoading, loadingKey, 'connector'),
  };
};
