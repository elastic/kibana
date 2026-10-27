/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import type { GetKiResponse } from '../../../../../common/http_api/knowledge_indicators';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';

interface UseKiPageHeaderMenuArgs {
  ki: GetKiResponse | undefined;
  error: Error | undefined;
  showContentEditAction: boolean;
  canRestore: boolean;
  canDelete: boolean;
  onStartContentEditing: () => void;
  onOpenRestoreConfirm: () => void;
  onOpenDeleteConfirm: () => void;
  isDeleteLoading: boolean;
  isRestoreLoading: boolean;
}

export const useKiPageHeaderMenu = ({
  ki,
  error,
  showContentEditAction,
  canRestore,
  canDelete,
  onStartContentEditing,
  onOpenRestoreConfirm,
  onOpenDeleteConfirm,
  isDeleteLoading,
  isRestoreLoading,
}: UseKiPageHeaderMenuArgs): AppHeaderMenu | undefined =>
  useMemo((): AppHeaderMenu | undefined => {
    if (!ki || error) {
      return undefined;
    }

    const menuItems = showContentEditAction
      ? [
          {
            id: 'editContent',
            label: i18n.translate('xpack.contextEngine.viewKi.editButton', {
              defaultMessage: 'Edit',
            }),
            iconType: 'pencil',
            overflow: true,
            order: 10,
            run: onStartContentEditing,
            testId: 'contextViewKiEditButton',
            ebt: {
              action: CONTEXT_ENGINE_UI_EBT.action.editKi.EDIT,
              detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
            },
          },
        ]
      : [];

    if (canRestore) {
      return {
        primaryActionItem: {
          id: 'restore',
          label: i18n.translate('xpack.contextEngine.viewKi.restoreButton', {
            defaultMessage: 'Restore',
          }),
          iconType: 'refresh',
          run: onOpenRestoreConfirm,
          isLoading: isRestoreLoading,
          testId: 'contextViewKiRestoreButton',
          ebt: {
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.RESTORE,
            detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          },
        },
        items: menuItems.length > 0 ? menuItems : undefined,
      };
    }

    if (canDelete) {
      return {
        primaryActionItem: {
          id: 'delete',
          label: i18n.translate('xpack.contextEngine.viewKi.deleteButton', {
            defaultMessage: 'Delete',
          }),
          iconType: 'trash',
          run: onOpenDeleteConfirm,
          isLoading: isDeleteLoading,
          testId: 'contextViewKiDeleteButton',
          ebt: {
            action: CONTEXT_ENGINE_UI_EBT.action.viewKi.DELETE,
            detail: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
          },
        },
        items: menuItems.length > 0 ? menuItems : undefined,
      };
    }

    if (menuItems.length > 0) {
      return {
        items: menuItems,
      };
    }

    return undefined;
  }, [
    canDelete,
    canRestore,
    error,
    isDeleteLoading,
    isRestoreLoading,
    ki,
    onOpenDeleteConfirm,
    onOpenRestoreConfirm,
    onStartContentEditing,
    showContentEditAction,
  ]);
