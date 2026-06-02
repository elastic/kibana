/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { AppHeaderBadge, AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import type { CaseStatuses } from '../../../../../common/types/domain';
import type { CaseUI } from '../../../../../common';
import { useAllCasesNavigation } from '../../../../common/navigation';
import { useCasesContext } from '../../../cases_context/use_cases_context';
import { useCasesToast } from '../../../../common/use_cases_toast';
import { useRefreshCaseViewPage } from '../../../case_view/use_on_refresh_case_view_page';
import { useGetCaseConnectors } from '../../../../containers/use_get_case_connectors';
import { useDeleteCases } from '../../../../containers/use_delete_cases';
import { useShouldDisableStatus } from '../../../actions/status/use_should_disable_status';
import { useStatusAction } from '../../../actions/status/use_status_action';
import { statuses } from '../../../status/config';
import type { OnUpdateFields } from '../../../case_view/types';
import * as i18n from '../../../case_view/translations';
import * as commonI18n from '../../../../common/translations';

interface UseCaseViewHeaderArgs {
  caseData: CaseUI;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const useCaseViewHeader = ({ caseData, onUpdateField }: UseCaseViewHeaderArgs) => {
  const { permissions } = useCasesContext();
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();
  const { showSuccessToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { mutate: deleteCases } = useDeleteCases();

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  // Status
  const statusAction = useStatusAction({
    isDisabled: false,
    onAction: () => {},
    onActionSuccess: refreshCaseViewPage,
    selectedStatus: caseData.status,
  });

  const shouldDisableStatusFn = useShouldDisableStatus();
  const isStatusMenuDisabled = useMemo(() => {
    return shouldDisableStatusFn([caseData]);
  }, [caseData, shouldDisableStatusFn]);

  const onStatusChanged = useCallback(
    (status: CaseStatuses, closeReason?: string) => {
      if (status !== 'closed') {
        onUpdateField({ key: 'status', value: status });
      } else {
        statusAction.handleUpdateCaseStatus([caseData], status, closeReason);
      }
    },
    [caseData, onUpdateField, statusAction]
  );

  // Title
  const headerTitle = useMemo(() => {
    const prefix = typeof caseData.incrementalId === 'number' ? `#${caseData.incrementalId} ` : '';
    return `${prefix}${caseData.title}`;
  }, [caseData.incrementalId, caseData.title]);

  // Back
  const backHref = useMemo(() => getAllCasesUrl(), [getAllCasesUrl]);

  // Badges
  const badges: AppHeaderBadge[] = useMemo(() => {
    const result: AppHeaderBadge[] = [];

    const severityColorMap: Record<string, AppHeaderBadge['color']> = {
      low: 'default',
      medium: 'warning',
      high: 'danger',
      critical: 'danger',
    };
    result.push({
      label: caseData.severity,
      color: severityColorMap[caseData.severity] ?? 'default',
      'data-test-subj': 'case-view-severity-badge',
    });

    const statusConfig = statuses[caseData.status];
    const statusBadge: AppHeaderBadge = {
      label: statusConfig.label,
      color: statusConfig.color as AppHeaderBadge['color'],
      'data-test-subj': 'case-view-status-badge',
    };

    if (!isStatusMenuDisabled) {
      statusBadge.items = [
        {
          name: statuses.open.label,
          onClick: () => onStatusChanged('open' as CaseStatuses),
          'data-test-subj': 'case-view-status-dropdown-open',
        },
        {
          name: statuses['in-progress'].label,
          onClick: () => onStatusChanged('in-progress' as CaseStatuses),
          'data-test-subj': 'case-view-status-dropdown-in-progress',
        },
        {
          name: statuses.closed.label,
          onClick: () => onStatusChanged('closed' as CaseStatuses),
          'data-test-subj': 'case-view-status-dropdown-closed',
        },
      ];
    }
    result.push(statusBadge);

    if (caseData.totalAlerts > 0) {
      result.push({
        label: String(caseData.totalAlerts),
        color: 'danger',
        'data-test-subj': 'case-view-alerts-count-badge',
      });
    }

    return result;
  }, [
    caseData.severity,
    caseData.status,
    caseData.totalAlerts,
    isStatusMenuDisabled,
    onStatusChanged,
  ]);

  // Menu
  const currentExternalIncident =
    caseConnectors?.[caseData.connector.id]?.push.details?.externalService ?? null;

  const menu: AppHeaderMenu = useMemo(() => {
    const items = [
      {
        id: 'refreshCase',
        label: i18n.CASE_REFRESH,
        iconType: 'refresh' as const,
        run: () => refreshCaseViewPage(),
        testId: 'case-refresh',
        order: 100,
      },
      ...(permissions.update
        ? [
            {
              id: 'caseSettings',
              label: i18n.CASE_SETTINGS,
              iconType: 'gear' as const,
              run: (params?: AppMenuRunActionParams) => {
                if (params?.triggerElement) {
                  setSettingsAnchor(params.triggerElement);
                }
                setIsSettingsOpen((prev) => !prev);
              },
              testId: 'case-settings-button',
              order: 200,
            },
          ]
        : []),
      {
        id: 'copyId',
        label: i18n.COPY_ID_ACTION_LABEL,
        iconType: 'copy' as const,
        run: () => {
          navigator.clipboard.writeText(caseData.id);
          showSuccessToast(i18n.COPY_ID_ACTION_SUCCESS);
        },
        testId: 'case-action-copy-id',
        order: 300,
        overflow: true,
      },
      ...(currentExternalIncident != null && currentExternalIncident?.externalUrl
        ? [
            {
              id: 'viewIncident',
              label: i18n.VIEW_INCIDENT(currentExternalIncident?.externalTitle ?? ''),
              iconType: 'external' as const,
              run: () => window.open(currentExternalIncident?.externalUrl, '_blank'),
              testId: 'case-action-view-incident',
              order: 400,
              overflow: true,
            },
          ]
        : []),
      ...(permissions.delete
        ? [
            {
              id: 'deleteCase',
              label: commonI18n.DELETE_CASE(),
              iconType: 'trash' as const,
              run: () => setIsDeleteModalVisible(true),
              testId: 'case-action-delete',
              order: 900,
              overflow: true,
            },
          ]
        : []),
    ];

    return { items };
  }, [
    refreshCaseViewPage,
    permissions.update,
    permissions.delete,
    caseData.id,
    showSuccessToast,
    currentExternalIncident,
  ]);

  // Delete
  const onConfirmDeletion = useCallback(() => {
    setIsDeleteModalVisible(false);
    deleteCases(
      { caseIds: [caseData.id], successToasterTitle: i18n.DELETED_CASES(1) },
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
