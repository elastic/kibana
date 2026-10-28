/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { CasesPermissions } from '../../../../../../common';
import * as i18n from '../../../translations';
import * as commonI18n from '../../../../../common/translations';
import { ADD_TO_CHAT, SUMMARIZE_CASE } from '../../../../../agent_builder/translations';
import * as workflowI18n from '../../../../workflows/translations';

interface ExternalIncident {
  externalUrl?: string | null;
  externalTitle?: string | null;
}

export interface CaseSettingToggle {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
  testId: string;
}

interface GetMenuArgs {
  permissions: CasesPermissions;
  /**
   * Case settings enabled by the current solution (alert syncing, observable extraction, or
   * metrics). When empty the settings item is omitted entirely.
   */
  settingToggles: CaseSettingToggle[];
  caseId: string;
  currentExternalIncident: ExternalIncident | null;
  chat: { addToChat: () => void; summarizeCase: () => void; isAddToChatAvailable: boolean };
  onRefresh: () => void;
  onCopyId: () => Promise<void>;
  onOpenDeleteModal: () => void;
  /** When provided, adds a "Run workflow" item gated on `canRunWorkflow`. */
  runWorkflow?: { canRunWorkflow: boolean; onOpen: () => void };
}

export const getMenu = ({
  permissions,
  settingToggles,
  caseId,
  chat,
  currentExternalIncident,
  onRefresh,
  onCopyId,
  onOpenDeleteModal,
  runWorkflow,
}: GetMenuArgs): AppHeaderMenu => {
  const items = [
    {
      id: 'refreshCase',
      label: i18n.CASE_REFRESH,
      iconType: 'refresh' as const,
      run: () => onRefresh(),
      testId: 'case-refresh',
      order: 100,
    },
    ...(runWorkflow?.canRunWorkflow
      ? [
          {
            id: 'runWorkflow',
            label: workflowI18n.RUN_WORKFLOW,
            iconType: 'play' as const,
            run: () => runWorkflow.onOpen(),
            testId: 'case-run-workflow-button',
            order: 150,
          },
        ]
      : []),
    ...(permissions.update && settingToggles.length > 0
      ? [
          {
            id: 'caseSettings',
            label: i18n.CASE_SETTINGS,
            iconType: 'gear' as const,
            items: settingToggles.map(({ id, label, checked, onToggle, testId }) => ({
              id,
              label,
              iconType: checked ? 'check' : 'empty',
              run: onToggle,
              testId,
            })),
            testId: 'case-settings-button',
            popoverTestId: 'case-settings-popover',
            order: 200,
          },
        ]
      : []),
    {
      id: 'copyId',
      label: commonI18n.COPY_ID_ACTION_LABEL,
      iconType: 'copy' as const,
      run: () => onCopyId(),
      testId: 'case-action-copy-id',
      order: 300,
      overflow: true,
    },
    ...(currentExternalIncident?.externalUrl
      ? [
          {
            id: 'viewIncident',
            label: i18n.VIEW_INCIDENT(currentExternalIncident.externalTitle ?? ''),
            iconType: 'external' as const,
            run: () => window.open(currentExternalIncident.externalUrl as string, '_blank'),
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
            run: () => onOpenDeleteModal(),
            testId: 'case-action-delete',
            order: 900,
            overflow: true,
          },
        ]
      : []),
  ];

  return {
    items,
    ...(chat.isAddToChatAvailable
      ? {
          primaryActionItem: {
            id: 'caseChatActions',
            label: ADD_TO_CHAT,
            iconType: 'productAgent' as const,
            testId: 'case-chat-actions',
            popoverTestId: 'case-chat-actions-popover',
            popoverWidth: 200,
            items: [
              {
                id: 'addToChat',
                label: ADD_TO_CHAT,
                run: () => chat.addToChat(),
                testId: 'case-chat-action-add-to-chat',
                order: 100,
              },
              {
                id: 'summarizeCase',
                label: SUMMARIZE_CASE,
                run: () => chat.summarizeCase(),
                testId: 'case-chat-action-summarize',
                order: 200,
              },
            ],
          },
        }
      : {}),
  };
};
