/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CaseStatuses } from '../../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../../common';
import { useAllCasesNavigation } from '../../../../../../common/navigation';
import { useCasesContext } from '../../../../../cases_context/use_cases_context';
import { useCasesToast } from '../../../../../../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../../../../../case_view/use_on_refresh_case_view_page';
import { useGetCaseConnectors } from '../../../../../../containers/use_get_case_connectors';
import { useDeleteCases } from '../../../../../../containers/use_delete_cases';
import { useShouldDisableStatus } from '../../../../../actions/status/use_should_disable_status';
import * as commonI18n from '../../../../../../common/translations';
import { getBadges } from '../utils/header_badges';
import { getMenu } from '../utils/header_menu';

interface UseCaseViewHeaderArgs {
  caseData: CaseUI;
  onStatusChanged: (status: CaseStatuses) => void;
}

export const useCaseViewHeader = ({ caseData, onStatusChanged }: UseCaseViewHeaderArgs) => {
  const { permissions } = useCasesContext();
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { mutate: deleteCases } = useDeleteCases();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  const shouldDisableStatusFn = useShouldDisableStatus();
  const isStatusMenuDisabled = useMemo(() => {
    return shouldDisableStatusFn([caseData]);
  }, [caseData, shouldDisableStatusFn]);

  // Title
  const headerTitle = useMemo(() => {
    const prefix = typeof caseData.incrementalId === 'number' ? `#${caseData.incrementalId} ` : '';
    return `${prefix}${caseData.title}`;
  }, [caseData.incrementalId, caseData.title]);

  // Back
  const backHref = useMemo(() => getAllCasesUrl(), [getAllCasesUrl]);

  // Badges
  const badges = useMemo(
    () => getBadges({ caseData, isStatusMenuDisabled, onStatusChanged }),
    [caseData, isStatusMenuDisabled, onStatusChanged]
  );

  // Menu
  const currentExternalIncident = useMemo(
    () => caseConnectors?.[caseData.connector.id]?.push.details?.externalService ?? null,
    [caseConnectors, caseData.connector.id]
  );

  const onOpenSettings = useCallback((anchor: HTMLElement) => {
    setSettingsAnchor(anchor);
    setIsSettingsOpen((prev) => !prev);
  }, []);

  const onCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(caseData.id);
      showSuccessToast(commonI18n.COPY_ID_ACTION_SUCCESS);
    } catch (error) {
      showErrorToast(error as Error);
    }
  }, [caseData.id, showSuccessToast, showErrorToast]);

  const onOpenDeleteModal = useCallback(() => {
    setIsDeleteModalVisible(true);
  }, []);

  const menu = useMemo(
    () =>
      getMenu({
        permissions,
        caseId: caseData.id,
        currentExternalIncident,
        onRefresh: refreshCaseViewPage,
        onOpenSettings,
        onCopyId,
        onOpenDeleteModal,
      }),
    [
      permissions,
      caseData.id,
      currentExternalIncident,
      refreshCaseViewPage,
      onOpenSettings,
      onCopyId,
      onOpenDeleteModal,
    ]
  );

  // Delete
  const onConfirmDeletion = useCallback(() => {
    setIsDeleteModalVisible(false);
    deleteCases(
      { caseIds: [caseData.id], successToasterTitle: commonI18n.DELETED_CASES(1) },
      { onSuccess: navigateToAllCases }
    );
  }, [caseData.id, deleteCases, navigateToAllCases]);

  return {
    headerTitle,
    backHref,
    badges,
    menu,
    isDeleteModalVisible,
    setIsDeleteModalVisible,
    onConfirmDeletion,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsAnchor,
  };
};
