/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useContext, useEffect, useMemo } from 'react';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ALERT_CASE_IDS, isSiemRuleType } from '@kbn/rule-data-utils';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import {
  AlertsTableConfigurationRegistry,
  BulkActionsConfig,
  BulkActionsPanelConfig,
  BulkActionsState,
  BulkActionsVerbs,
  BulkActionsReducerAction,
  UseBulkActionsRegistry,
} from '../../../../types';
import {
  getLeadingControlColumn as getBulkActionsLeadingControlColumn,
  GetLeadingControlColumn,
} from '../bulk_actions/get_leading_control_column';
import { CasesService } from '../types';
import {
  ADD_TO_EXISTING_CASE,
  ADD_TO_NEW_CASE,
  ALERTS_ALREADY_ATTACHED_TO_CASE,
  MARK_AS_UNTRACKED,
  NO_ALERTS_ADDED_TO_CASE,
} from './translations';
import { TimelineItem } from '../bulk_actions/components/toolbar';
import { useBulkUntrackAlerts } from './use_bulk_untrack_alerts';
import { useBulkUntrackAlertsByQuery } from './use_bulk_untrack_alerts_by_query';

interface BulkActionsProps {
  query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  alertsCount: number;
  casesConfig?: AlertsTableConfigurationRegistry['cases'];
  useBulkActionsConfig?: UseBulkActionsRegistry;
  refresh: () => void;
  ruleTypeIds?: string[];
  hideBulkActions?: boolean;
}

export interface UseBulkActions {
  isBulkActionsColumnActive: boolean;
  getBulkActionsLeadingControlColumn: GetLeadingControlColumn;
  bulkActionsState: BulkActionsState;
  bulkActions: BulkActionsPanelConfig[];
  setIsBulkActionsLoading: (isLoading: boolean) => void;
  clearSelection: () => void;
  updateBulkActionsState: React.Dispatch<BulkActionsReducerAction>;
}

type UseBulkAddToCaseActionsProps = Pick<BulkActionsProps, 'casesConfig' | 'refresh'> &
  Pick<UseBulkActions, 'clearSelection'>;

type UseBulkUntrackActionsProps = Pick<BulkActionsProps, 'refresh' | 'query' | 'ruleTypeIds'> &
  Pick<UseBulkActions, 'clearSelection' | 'setIsBulkActionsLoading'> & {
    isAllSelected: boolean;
  };

const filterAlertsAlreadyAttachedToCase = (alerts: TimelineItem[], caseId: string) =>
  alerts.filter(
    (alert) =>
      !alert.data.some(
        (field) => field.field === ALERT_CASE_IDS && field.value?.some((id) => id === caseId)
      )
  );

const getCaseAttachments = ({
  alerts,
  caseId,
  groupAlertsByRule,
}: {
  caseId: string;
  groupAlertsByRule?: CasesService['helpers']['groupAlertsByRule'];
  alerts?: TimelineItem[];
}) => {
  const filteredAlerts = filterAlertsAlreadyAttachedToCase(alerts ?? [], caseId);
  return groupAlertsByRule?.(filteredAlerts) ?? [];
};

const addItemsToInitialPanel = ({
  panels,
  items,
}: {
  panels: BulkActionsPanelConfig[];
  items: BulkActionsConfig[];
}) => {
  if (panels.length > 0) {
    if (panels[0].items) {
      panels[0].items = [...panels[0].items, ...items].filter(
        (item, index, self) => index === self.findIndex((newItem) => newItem.key === item.key)
      );
    }
    return panels;
  } else {
    return [{ id: 0, items }];
  }
};

export const useBulkAddToCaseActions = ({
  casesConfig,
  refresh,
  clearSelection,
}: UseBulkAddToCaseActionsProps): BulkActionsConfig[] => {
  const { cases: casesService } = useKibana<{ cases?: CasesService }>().services;

  const userCasesPermissions = useMemo(() => {
    return casesService?.helpers.canUseCases(casesConfig?.owner ?? []);
  }, [casesConfig?.owner, casesService]);
  const CasesContext = useMemo(() => casesService?.ui.getCasesContext(), [casesService]);
  const isCasesContextAvailable = Boolean(casesService && CasesContext);

  const onSuccess = useCallback(() => {
    refresh();
    clearSelection();
  }, [clearSelection, refresh]);

  const createCaseFlyout = casesService?.hooks.useCasesAddToNewCaseFlyout({ onSuccess });
  const selectCaseModal = casesService?.hooks.useCasesAddToExistingCaseModal({
    onSuccess,
    noAttachmentsToaster: {
      title: NO_ALERTS_ADDED_TO_CASE,
      content: ALERTS_ALREADY_ATTACHED_TO_CASE,
    },
  });

  return useMemo(() => {
    return isCasesContextAvailable &&
      createCaseFlyout &&
      selectCaseModal &&
      userCasesPermissions?.create &&
      userCasesPermissions?.read
      ? [
          {
            label: ADD_TO_NEW_CASE,
            key: 'attach-new-case',
            'data-test-subj': 'attach-new-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_NEW_CASE,
            onClick: (alerts?: TimelineItem[]) => {
              const caseAttachments = alerts
                ? casesService?.helpers.groupAlertsByRule(alerts) ?? []
                : [];

              createCaseFlyout.open({
                attachments: caseAttachments,
              });
            },
          },
          {
            label: ADD_TO_EXISTING_CASE,
            key: 'attach-existing-case',
            disableOnQuery: true,
            disabledLabel: ADD_TO_EXISTING_CASE,
            'data-test-subj': 'attach-existing-case',
            onClick: (alerts?: TimelineItem[]) => {
              selectCaseModal.open({
                getAttachments: ({ theCase }) => {
                  if (theCase == null) {
                    return alerts ? casesService?.helpers.groupAlertsByRule(alerts) ?? [] : [];
                  }

                  return getCaseAttachments({
                    alerts,
                    caseId: theCase.id,
                    groupAlertsByRule: casesService?.helpers.groupAlertsByRule,
                  });
                },
              });
            },
          },
        ]
      : [];
  }, [
    casesService?.helpers,
    createCaseFlyout,
    isCasesContextAvailable,
    selectCaseModal,
    userCasesPermissions?.create,
    userCasesPermissions?.read,
  ]);
};

export const useBulkUntrackActions = ({
  setIsBulkActionsLoading,
  refresh,
  clearSelection,
  query,
  ruleTypeIds = [],
  isAllSelected,
}: UseBulkUntrackActionsProps) => {
  const onSuccess = useCallback(() => {
    refresh();
    clearSelection();
  }, [clearSelection, refresh]);

  const { application } = useKibana().services;
  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
  const { mutateAsync: untrackAlertsByQuery } = useBulkUntrackAlertsByQuery();

  const hasApmPermission = application?.capabilities.apm?.['alerting:show'];
  const hasInfrastructurePermission = application?.capabilities.infrastructure?.show;
  const hasLogsPermission = application?.capabilities.logs?.show;
  const hasUptimePermission = application?.capabilities.uptime?.show;
  const hasSloPermission = application?.capabilities.slo?.show;
  const hasObservabilityPermission = application?.capabilities.observability?.show;
  const onClick = useCallback(
    async (alerts?: TimelineItem[]) => {
      if (!alerts) return;
      const alertUuids = alerts.map((alert) => alert._id);
      const indices = alerts.map((alert) => alert._index ?? '');
      try {
        setIsBulkActionsLoading(true);
        if (isAllSelected) {
          await untrackAlertsByQuery({ query, ruleTypeIds });
        } else {
          await untrackAlerts({ indices, alertUuids });
        }
        onSuccess();
      } finally {
        setIsBulkActionsLoading(false);
      }
    },
    [
      query,
      ruleTypeIds,
      isAllSelected,
      onSuccess,
      setIsBulkActionsLoading,
      untrackAlerts,
      untrackAlertsByQuery,
    ]
  );

  return useMemo(() => {
    // Check if at least one Observability feature is enabled
    if (!application?.capabilities) return [];
    if (
      !hasApmPermission &&
      !hasInfrastructurePermission &&
      !hasLogsPermission &&
      !hasUptimePermission &&
      !hasSloPermission &&
      !hasObservabilityPermission
    )
      return [];
    return [
      {
        label: MARK_AS_UNTRACKED,
        key: 'mark-as-untracked',
        disableOnQuery: false,
        disabledLabel: MARK_AS_UNTRACKED,
        'data-test-subj': 'mark-as-untracked',
        onClick,
      },
    ];
  }, [
    application?.capabilities,
    hasApmPermission,
    hasInfrastructurePermission,
    hasLogsPermission,
    hasUptimePermission,
    hasSloPermission,
    hasObservabilityPermission,
    onClick,
  ]);
};

export function useBulkActions({
  alertsCount,
  casesConfig,
  query,
  refresh,
  useBulkActionsConfig = () => [],
  ruleTypeIds,
  hideBulkActions,
}: BulkActionsProps): UseBulkActions {
  const {
    bulkActions: [bulkActionsState, updateBulkActionsState],
  } = useContext(AlertsTableContext);
  const configBulkActionPanels = useBulkActionsConfig(query, refresh);

  const clearSelection = useCallback(() => {
    updateBulkActionsState({ action: BulkActionsVerbs.clear });
  }, [updateBulkActionsState]);
  const setIsBulkActionsLoading = useCallback(
    (isLoading: boolean = true) => {
      updateBulkActionsState({ action: BulkActionsVerbs.updateAllLoadingState, isLoading });
    },
    [updateBulkActionsState]
  );
  const caseBulkActions = useBulkAddToCaseActions({ casesConfig, refresh, clearSelection });
  const untrackBulkActions = useBulkUntrackActions({
    setIsBulkActionsLoading,
    refresh,
    clearSelection,
    query,
    ruleTypeIds,
    isAllSelected: bulkActionsState.isAllSelected,
  });

  const initialItems = useMemo(() => {
    return [...caseBulkActions, ...(ruleTypeIds?.some(isSiemRuleType) ? [] : untrackBulkActions)];
  }, [caseBulkActions, ruleTypeIds, untrackBulkActions]);

  const bulkActions = useMemo(() => {
    if (hideBulkActions) {
      return [];
    }

    return initialItems.length
      ? addItemsToInitialPanel({
          panels: configBulkActionPanels,
          items: initialItems,
        })
      : configBulkActionPanels;
  }, [configBulkActionPanels, initialItems, hideBulkActions]);

  const isBulkActionsColumnActive = bulkActions.length !== 0;

  useEffect(() => {
    updateBulkActionsState({
      action: BulkActionsVerbs.rowCountUpdate,
      rowCount: alertsCount,
    });
  }, [alertsCount, updateBulkActionsState]);

  return useMemo(() => {
    return {
      isBulkActionsColumnActive,
      getBulkActionsLeadingControlColumn,
      bulkActionsState,
      bulkActions,
      setIsBulkActionsLoading,
      clearSelection,
      updateBulkActionsState,
    };
  }, [
    bulkActions,
    bulkActionsState,
    clearSelection,
    isBulkActionsColumnActive,
    setIsBulkActionsLoading,
    updateBulkActionsState,
  ]);
}
