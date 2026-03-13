/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { ToastInputFields } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import type { CaseUpdateRequest } from '../../../../common/ui';
import { useUpdateCases } from '../../../containers/use_bulk_update_case';
import type { CasesUI } from '../../../../common';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
import { CaseStatuses } from '../../../../common/types/domain';
import { OWNER_INFO } from '../../../../common/constants';
import { isValidOwner } from '../../../../common/utils/owner';

import * as i18n from './translations';
import type { UseActionProps } from '../types';
import { statuses } from '../../status';
import { useUserPermissions } from '../../user_actions/use_user_permissions';
import { useShouldDisableStatus } from './use_should_disable_status';
import { useKibana } from '../../../common/lib/kibana';
import { useApplication } from '../../../common/lib/kibana/use_application';
import { generateCaseViewPath } from '../../../common/navigation';

const getStatusToast = ({
  status,
  cases,
  alertStatusSyncCount,
  totalAlertsCount,
}: {
  status: CaseStatuses;
  cases: CasesUI;
  alertStatusSyncCount: number;
  totalAlertsCount?: number;
}): { title: string; text?: string } => {
  const totalCases = cases.length;
  const caseTitle = totalCases === 1 ? cases[0].title : '';

  if (status === CaseStatuses.open) {
    return { title: i18n.REOPENED_CASES({ totalCases, caseTitle }) };
  } else if (status === CaseStatuses['in-progress']) {
    return { title: i18n.MARK_IN_PROGRESS_CASES({ totalCases, caseTitle }) };
  } else if (status === CaseStatuses.closed) {
    return {
      title: i18n.CLOSED_CASES({ totalCases, caseTitle }),
      text:
        totalAlertsCount == null
          ? undefined
          : i18n.CLOSED_CASES_SUMMARY(alertStatusSyncCount, totalAlertsCount),
    };
  }

  return { title: '' };
};

const StatusToastContent = ({
  summary,
  onSeeAlertsClick,
}: {
  summary: string;
  onSeeAlertsClick: () => void;
}) => (
  <>
    <EuiText size="s" data-test-subj="cases-status-close-sync-summary">
      {summary}
    </EuiText>
    <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          onClick={onSeeAlertsClick}
          data-test-subj="cases-status-close-sync-see-alerts"
        >
          {i18n.SEE_ALERTS}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </>
);
StatusToastContent.displayName = 'StatusToastContent';

interface UseStatusActionProps extends UseActionProps {
  selectedStatus?: CaseStatuses;
}

export const useStatusAction = ({
  onAction,
  onActionSuccess,
  isDisabled,
  selectedStatus,
}: UseStatusActionProps) => {
  const { mutate: updateCases, isLoading: isUpdatingStatus } = useUpdateCases();
  const { canUpdate, canReopenCase } = useUserPermissions();
  const { appId } = useApplication();
  const { application, i18n: i18nStart, theme, userProfile } = useKibana().services;
  const handleUpdateCaseStatus = useCallback(
    (selectedCases: CasesUI, status: CaseStatuses, closeReason?: string) => {
      onAction();
      const casesToUpdate = selectedCases.map((theCase) => ({
        status,
        id: theCase.id,
        version: theCase.version,
        closeReason,
      })) as CaseUpdateRequest[];

      updateCases(
        {
          cases: casesToUpdate,
          getUpdateSuccessToast: ({ patchCaseStats }) => {
            const alertStatusSyncCount =
              patchCaseStats?.reduce((total, stats) => {
                return total + (stats?.numberOfAlertsWithStatusSynced ?? 0);
              }, 0) ?? 0;
            const totalAlertsCount = selectedCases.reduce(
              (total, currentCase) => total + currentCase.totalAlerts,
              0
            );

            const toast = getStatusToast({
              status,
              cases: selectedCases,
              alertStatusSyncCount,
              totalAlertsCount: totalAlertsCount !== 0 ? totalAlertsCount : undefined,
            });

            const theCase = selectedCases[0];

            const isSingleCaseWithSyncAlerts =
              selectedCases.length === 1 && theCase.settings.syncAlerts && toast.text != null;

            if (!isSingleCaseWithSyncAlerts) {
              return toast;
            }

            const summary = toast.text;
            if (summary == null) {
              return toast;
            }

            const appIdToNavigateTo =
              theCase != null && isValidOwner(theCase.owner)
                ? OWNER_INFO[theCase.owner].appId
                : appId;

            const alertsUrl =
              appIdToNavigateTo != null
                ? application.getUrlForApp(appIdToNavigateTo, {
                    deepLinkId: 'cases',
                    path: generateCaseViewPath({
                      detailName: theCase.id,
                      tabId: CASE_VIEW_PAGE_TABS.ALERTS,
                    }),
                  })
                : null;

            if (alertsUrl == null) {
              return toast;
            }

            // Show toast with 're-direct to case alerts' button when closing a single case
            return {
              ...toast,
              text: toMountPoint(
                <StatusToastContent
                  summary={summary}
                  onSeeAlertsClick={() =>
                    application.navigateToUrl(alertsUrl, { forceRedirect: true })
                  }
                />,
                { i18n: i18nStart, theme, userProfile }
              ) as ToastInputFields['text'],
            };
          },
        },
        { onSuccess: onActionSuccess }
      );
    },
    [onAction, updateCases, onActionSuccess, appId, application, i18nStart, theme, userProfile]
  );

  const shouldDisableStatus = useShouldDisableStatus();

  const getStatusIcon = (status: CaseStatuses): string =>
    selectedStatus && selectedStatus === status ? 'check' : 'empty';

  const getActions = (selectedCases: CasesUI): EuiContextMenuPanelItemDescriptor[] => {
    return [
      {
        name: statuses[CaseStatuses.open].label,
        icon: getStatusIcon(CaseStatuses.open),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses.open),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-open',
        key: 'cases-bulk-action-status-open',
      },
      {
        name: statuses[CaseStatuses['in-progress']].label,
        icon: getStatusIcon(CaseStatuses['in-progress']),
        onClick: () => handleUpdateCaseStatus(selectedCases, CaseStatuses['in-progress']),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-in-progress',
        key: 'cases-bulk-action-status-in-progress',
      },
      {
        name: statuses[CaseStatuses.closed].label,
        icon: getStatusIcon(CaseStatuses.closed),
        disabled: isDisabled || shouldDisableStatus(selectedCases),
        'data-test-subj': 'cases-bulk-action-status-closed',
        key: 'cases-bulk-action-status-closed',
      },
    ];
  };

  return {
    getActions,
    canUpdateStatus: canUpdate || canReopenCase,
    handleUpdateCaseStatus,
    isUpdatingStatus,
  };
};

export type UseStatusAction = ReturnType<typeof useStatusAction>;
