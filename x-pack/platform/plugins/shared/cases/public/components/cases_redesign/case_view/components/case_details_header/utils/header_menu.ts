/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import type { AppMenuRunActionParams } from '@kbn/core-chrome-app-menu-components';
import type { CasesPermissions } from '../../../../../../../common';
import * as i18n from '../../../../../case_view/translations';
import * as commonI18n from '../../../../../../common/translations';

interface ExternalIncident {
  externalUrl?: string | null;
  externalTitle?: string | null;
}

interface GetMenuArgs {
  permissions: CasesPermissions;
  caseId: string;
  currentExternalIncident: ExternalIncident | null;
  onRefresh: () => void;
  onOpenSettings: (anchor: HTMLElement) => void;
  onCopyId: () => Promise<void>;
  onOpenDeleteModal: () => void;
}

export const getMenu = ({
  permissions,
  caseId,
  currentExternalIncident,
  onRefresh,
  onOpenSettings,
  onCopyId,
  onOpenDeleteModal,
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
    ...(permissions.update
      ? [
          {
            id: 'caseSettings',
            label: i18n.CASE_SETTINGS,
            iconType: 'gear' as const,
            run: (params?: AppMenuRunActionParams) => {
              if (params?.triggerElement) {
                onOpenSettings(params.triggerElement);
              }
            },
            testId: 'case-settings-button',
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

  return { items };
};
