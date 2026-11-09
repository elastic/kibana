/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment-timezone';
import type { AppHeaderMetadataItems, AppHeaderTitle } from '@kbn/app-header';
import { APP_MENU_TEST_SUBJECTS } from '@kbn/app-menu';
import type {
  CaseAccessMode,
  CaseSeverity,
  CaseStatusConfiguration,
} from '../../../../../../common/types/domain';
import type { CaseUI } from '../../../../../../common';
import { useCaseStatuses } from '../../../../status/use_case_statuses';
import type { OnUpdateFields } from '../../../types';
import { useAllCasesNavigation } from '../../../../../common/navigation';
import { useCasesContext } from '../../../../cases_context/use_cases_context';
import { useCasesFeatures } from '../../../../../common/use_cases_features';
import { useCasesToast } from '../../../../../common/use_cases_toast';
import { useCasesConfig, useDateFormat, useTimeZone } from '../../../../../common/lib/kibana';
import { useRefreshCaseViewPage } from '../../../use_on_refresh_case_view_page';
import { useGetCaseConnectors } from '../../../../../containers/use_get_case_connectors';
import { useDeleteCases } from '../../../../../containers/use_delete_cases';
import { useShouldDisableStatus } from '../../../../actions/status/use_should_disable_status';
import * as commonI18n from '../../../../../common/translations';
import { useAddCaseToChat } from '../../../../../agent_builder/use_add_case_to_chat';
import {
  REPORTED_BY,
  CREATED_ON,
  UNKNOWN_REPORTER,
  EDIT_CASE_NAME_ARIA,
  BYLINE_OPENED_FROM_ALERTZERO,
  BYLINE_UPDATED,
} from '../../../translations';
import { getBadges } from '../utils/header_badges';
import { getMenu } from '../utils/header_menu';
import { useRunCaseWorkflow } from '../../../../workflows/use_run_case_workflow';
import { RunCaseWorkflowModal } from '../../../../workflows/run_case_workflow_modal';
import { useIsRoomAvailable } from '../../room/use_room_availability';
import { useRoomOpenState } from '../../room/use_room';
import { ROOM_BUTTON } from '../../room/translations';

/**
 * Returns an element that stays mounted while the settings popover is open. When the settings item
 * is rendered inside the app menu "More" popover, its trigger is unmounted as soon as that popover
 * closes, so the settings popover is anchored to the "More" button instead. The open "More" button
 * is the only one marked as pressed, which also keeps this correct with several app menus on the page.
 */
const getSettingsAnchor = (triggerElement: HTMLElement): HTMLElement => {
  if (!triggerElement.closest(`[data-test-subj="${APP_MENU_TEST_SUBJECTS.popover}"]`)) {
    return triggerElement;
  }

  return (
    document.querySelector<HTMLElement>(
      `[data-test-subj="${APP_MENU_TEST_SUBJECTS.overflowButton}"][aria-pressed="true"]`
    ) ?? triggerElement
  );
};

interface UseCaseViewHeaderArgs {
  caseData: CaseUI;
  onStatusChanged: (status: CaseStatusConfiguration) => void;
  onSeverityChanged: (severity: CaseSeverity) => void;
  onAccessChanged: (mode: CaseAccessMode) => void;
  onUpdateField: (args: OnUpdateFields) => void;
}

export const useCaseViewHeader = ({
  caseData,
  onStatusChanged,
  onSeverityChanged,
  onAccessChanged,
  onUpdateField,
}: UseCaseViewHeaderArgs) => {
  const { permissions } = useCasesContext();
  const { hasCaseSettings, restrictedCasesAuthorized } = useCasesFeatures();
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();
  const { showSuccessToast, showErrorToast } = useCasesToast();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { data: caseConnectors } = useGetCaseConnectors(caseData.id);
  const { mutate: deleteCases } = useDeleteCases();
  const { addToChat, summarizeCase, isAddToChatAvailable } = useAddCaseToChat(caseData);

  const {
    canRunWorkflow,
    isModalOpen: isRunWorkflowModalOpen,
    openModal: openRunWorkflowModal,
    closeModal: closeRunWorkflowModal,
    inputs: workflowInputs,
    runWorkflow,
    telemetry: workflowTelemetry,
    filterWorkflow: workflowFilterWorkflow,
    sortWorkflow: workflowSortWorkflow,
  } = useRunCaseWorkflow({ caseData });

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);

  const shouldDisableStatusFn = useShouldDisableStatus();
  const isStatusMenuDisabled = useMemo(() => {
    return shouldDisableStatusFn([caseData]);
  }, [caseData, shouldDisableStatusFn]);
  const isSeverityMenuDisabled = !permissions.update;

  const dateFormat = useDateFormat();
  const timeZone = useTimeZone();

  // Title
  const headerTitle = useMemo((): AppHeaderTitle => {
    if (!permissions.update) {
      return caseData.title;
    }

    return {
      text: caseData.title,
      onSave: (nextTitle: string) => {
        if (!nextTitle.trim()) {
          return commonI18n.TITLE_REQUIRED;
        }
        onUpdateField({ key: 'title', value: nextTitle.trim() });
      },
      ariaLabel: EDIT_CASE_NAME_ARIA,
    };
  }, [caseData.title, permissions.update, onUpdateField]);

  const { agenticEnabled } = useCasesConfig();
  const isAlertZeroCase = agenticEnabled && caseData.source === 'alertzero';

  // Metadata
  const metadata = useMemo((): AppHeaderMetadataItems => {
    // Same precedence as `getUserDisplayName` (used for the participant avatars next to this
    // header) so both surfaces show the same name — e.g. serverless operator users have an email
    // but no full name.
    const reporterName =
      caseData.createdBy.fullName ||
      caseData.createdBy.email ||
      caseData.createdBy.username ||
      UNKNOWN_REPORTER;
    const incrementalIdItem =
      typeof caseData.incrementalId === 'number'
        ? {
            type: 'text' as const,
            label: `#${caseData.incrementalId}`,
            'data-test-subj': 'case-view-incremental-id',
          }
        : undefined;

    // The header has three metadata slots; an AlertZero case spends them on the byline the
    // source badge used to carry, so the badge row stays within what shows without overflow.
    if (isAlertZeroCase) {
      const openedItem = {
        type: 'text' as const,
        label: BYLINE_OPENED_FROM_ALERTZERO(reporterName, moment(caseData.createdAt).fromNow()),
        'data-test-subj': 'case-view-byline-opened',
      };
      const updatedItem = {
        type: 'text' as const,
        label: BYLINE_UPDATED(moment(caseData.updatedAt ?? caseData.createdAt).fromNow()),
        'data-test-subj': 'case-view-byline-updated',
      };
      return incrementalIdItem
        ? [incrementalIdItem, openedItem, updatedItem]
        : [openedItem, updatedItem];
    }

    const formattedDate = moment.tz(caseData.createdAt, timeZone).format(dateFormat);

    const reportedByItem = {
      type: 'text' as const,
      label: REPORTED_BY(reporterName),
      'data-test-subj': 'case-view-reported-by',
    };
    const createdAtItem = {
      type: 'text' as const,
      label: CREATED_ON(formattedDate),
      'data-test-subj': 'case-view-created-at',
    };

    return incrementalIdItem
      ? [incrementalIdItem, reportedByItem, createdAtItem]
      : [reportedByItem, createdAtItem];
  }, [
    caseData.incrementalId,
    caseData.createdBy,
    caseData.createdAt,
    caseData.updatedAt,
    isAlertZeroCase,
    timeZone,
    dateFormat,
  ]);

  // Back
  const backHref = useMemo(() => getAllCasesUrl(), [getAllCasesUrl]);

  // Badges
  const { enabledStatuses, getStatus } = useCaseStatuses();
  const badges = useMemo(
    () =>
      getBadges({
        caseData,
        currentStatus: getStatus(caseData.statusKey, caseData.status),
        statusOptions: enabledStatuses,
        isStatusMenuDisabled,
        isSeverityMenuDisabled,
        onStatusChanged,
        onSeverityChanged,
        ...(restrictedCasesAuthorized
          ? { access: { isMenuDisabled: !permissions.update, onAccessChanged } }
          : {}),
        statusFirst: agenticEnabled,
      }),
    [
      caseData,
      enabledStatuses,
      getStatus,
      isStatusMenuDisabled,
      isSeverityMenuDisabled,
      onStatusChanged,
      onSeverityChanged,
      restrictedCasesAuthorized,
      permissions.update,
      onAccessChanged,
      agenticEnabled,
    ]
  );

  // Menu
  const currentExternalIncident = useMemo(
    () => caseConnectors?.[caseData.connector.id]?.push.details?.externalService ?? null,
    [caseConnectors, caseData.connector.id]
  );

  // Read through a ref so `onOpenSettings`, and with it the menu config, stays stable across toggles.
  const isSettingsOpenRef = useRef(isSettingsOpen);
  useEffect(() => {
    isSettingsOpenRef.current = isSettingsOpen;
  }, [isSettingsOpen]);

  const onOpenSettings = useCallback((triggerElement: HTMLElement) => {
    if (isSettingsOpenRef.current) {
      setIsSettingsOpen(false);
      return;
    }
    setSettingsAnchor(getSettingsAnchor(triggerElement));
    setIsSettingsOpen(true);
  }, []);

  // The anchor can leave the DOM while the popover is open (e.g. the header switches between the
  // overflow and inline layouts). A detached anchor would reposition the popover to (0, 0), so close it.
  useEffect(() => {
    if (!isSettingsOpen || !settingsAnchor) {
      return;
    }

    const observer = new MutationObserver(() => {
      if (!settingsAnchor.isConnected) {
        setIsSettingsOpen(false);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isSettingsOpen, settingsAnchor]);

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

  const isRoomAvailable = useIsRoomAvailable();
  const [isRoomOpen, setRoomOpen] = useRoomOpenState();

  const menu = useMemo(
    () =>
      getMenu({
        permissions,
        hasCaseSettings,
        caseId: caseData.id,
        chat: {
          addToChat,
          summarizeCase,
          isAddToChatAvailable,
        },
        currentExternalIncident,
        onRefresh: refreshCaseViewPage,
        onOpenSettings,
        onCopyId,
        onOpenDeleteModal,
        runWorkflow: { canRunWorkflow, onOpen: openRunWorkflowModal },
        ...(isRoomAvailable
          ? { room: { label: ROOM_BUTTON, onToggle: () => setRoomOpen(!isRoomOpen) } }
          : {}),
      }),
    [
      isRoomAvailable,
      isRoomOpen,
      setRoomOpen,
      addToChat,
      canRunWorkflow,
      openRunWorkflowModal,
      summarizeCase,
      isAddToChatAvailable,
      permissions,
      hasCaseSettings,
      caseData.id,
      currentExternalIncident,
      refreshCaseViewPage,
      onOpenSettings,
      onCopyId,
      onOpenDeleteModal,
    ]
  );

  const runWorkflowModal = isRunWorkflowModalOpen ? (
    <RunCaseWorkflowModal
      inputs={workflowInputs}
      runWorkflow={runWorkflow}
      filterWorkflow={workflowFilterWorkflow}
      sortWorkflow={workflowSortWorkflow}
      onClose={closeRunWorkflowModal}
      telemetry={workflowTelemetry}
    />
  ) : null;

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
    metadata,
    backHref,
    badges,
    menu,
    runWorkflowModal,
    isDeleteModalVisible,
    setIsDeleteModalVisible,
    onConfirmDeletion,
    isSettingsOpen,
    setIsSettingsOpen,
    settingsAnchor,
  };
};
