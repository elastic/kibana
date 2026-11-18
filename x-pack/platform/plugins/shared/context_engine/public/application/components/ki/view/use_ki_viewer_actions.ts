/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useBoolean } from '@kbn/react-hooks';
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';
import { useCallback } from 'react';
import type { KiContentPanelSaveFields } from './content/ki_content_panel';
import { useDeleteKi, useRestoreKi, useUpdateKi } from '../../../hooks/use_ki_mutations';
import { useKibana } from '../../../hooks/use_kibana';

interface UseKiViewerActionsArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
}

/** Edit / Delete / Restore for the viewer. Delete and Restore run at once (no confirm) and show a toast. */
export const useKiViewerActions = ({ aiIndexId, kiId, index }: UseKiViewerActionsArgs) => {
  const {
    services: { notifications, history, http, overlays, application },
  } = useKibana();
  const [isEditing, { on: startEditing, off: stopEditing }] = useBoolean(false);

  const updateKiMutation = useUpdateKi({ aiIndexId, kiId, index });
  const deleteKiMutation = useDeleteKi({ aiIndexId, kiId, index });
  const restoreKiMutation = useRestoreKi({ aiIndexId, kiId, index });

  // Blocks other documents, filter changes (they change `?doc=`) and leaving the page.
  useUnsavedChangesPrompt({
    hasUnsavedChanges: isEditing,
    history,
    http,
    openConfirm: overlays.openConfirm,
    navigateToUrl: application.navigateToUrl,
    titleText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.title', {
      defaultMessage: 'Discard unsaved changes?',
    }),
    messageText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.message', {
      defaultMessage: 'Your edits to this Knowledge document will be lost.',
    }),
    cancelButtonText: i18n.translate('xpack.contextEngine.viewKi.discardEditsModal.cancelButton', {
      defaultMessage: 'Keep editing',
    }),
    confirmButtonText: i18n.translate(
      'xpack.contextEngine.viewKi.discardEditsModal.confirmButton',
      {
        defaultMessage: 'Discard changes',
      }
    ),
  });

  const saveContent = useCallback(
    ({ content }: KiContentPanelSaveFields) => {
      updateKiMutation.mutate(
        { content },
        {
          onSuccess: () => {
            stopEditing();
            notifications.toasts.addSuccess({
              title: i18n.translate('xpack.contextEngine.viewKi.saveSuccessToast', {
                defaultMessage: 'Knowledge document updated',
              }),
            });
          },
          onError: (error) => {
            notifications.toasts.addError(error, {
              title: i18n.translate('xpack.contextEngine.viewKi.saveErrorToast', {
                defaultMessage: 'Unable to update Knowledge document',
              }),
            });
          },
        }
      );
    },
    [notifications.toasts, stopEditing, updateKiMutation]
  );

  const deleteKi = useCallback(() => {
    deleteKiMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.viewKi.deleteSuccessToast', {
            defaultMessage:
              'Deleted. It stays listed for reference and agents no longer retrieve it.',
          }),
        });
      },
      onError: (error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.contextEngine.viewKi.deleteErrorToast', {
            defaultMessage: 'Unable to delete Knowledge document',
          }),
        });
      },
    });
  }, [deleteKiMutation, notifications.toasts]);

  const restoreKi = useCallback(() => {
    restoreKiMutation.mutate(undefined, {
      onSuccess: () => {
        notifications.toasts.addSuccess({
          title: i18n.translate('xpack.contextEngine.viewKi.restoreSuccessToast', {
            defaultMessage: 'Restored. Agents can retrieve it again.',
          }),
        });
      },
      onError: (error) => {
        notifications.toasts.addError(error, {
          title: i18n.translate('xpack.contextEngine.viewKi.restoreErrorToast', {
            defaultMessage: 'Unable to restore Knowledge document',
          }),
        });
      },
    });
  }, [notifications.toasts, restoreKiMutation]);

  return {
    isEditing,
    startEditing,
    stopEditing,
    saveContent,
    isSaving: updateKiMutation.isLoading,
    deleteKi,
    isDeleting: deleteKiMutation.isLoading,
    restoreKi,
    isRestoring: restoreKiMutation.isLoading,
  };
};
