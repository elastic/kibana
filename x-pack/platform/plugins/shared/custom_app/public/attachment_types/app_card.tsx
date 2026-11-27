/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ActionButtonType,
  type ActionButton,
  type InlineRenderCallbacks,
} from '@kbn/agent-builder-browser/attachments';
import {
  SavedObjectSaveModalDashboard,
  type SaveModalDashboardProps,
} from '@kbn/presentation-util-plugin/public';
import {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  type AppDocument,
} from '@kbn/custom-app-common';
import { DetailsModal } from '../application/details_modal';
import { createSavedAppsClient } from '../application/saved_apps_client';
import { getServices } from '../services';
import { CUSTOM_APP_APPLICATION_ID } from '../../common/constants';
import { LiveApp } from '../components/live_app';

const saveLabel = i18n.translate('xpack.customApp.attachment.saveToDashboard', {
  defaultMessage: 'Save to dashboard',
});

const noWriteAccessReason = i18n.translate('xpack.customApp.attachment.noWriteAccess', {
  defaultMessage: 'You need dashboard write permissions to save an app to a dashboard.',
});

const saveAsAppLabel = i18n.translate('xpack.customApp.attachment.saveAsApp', {
  defaultMessage: 'Save as app',
});

const openAppLabel = i18n.translate('xpack.customApp.attachment.openApp', {
  defaultMessage: 'Open app',
});

const noSaveAccessReason = i18n.translate('xpack.customApp.attachment.noSaveAccess', {
  defaultMessage: 'You need the Custom apps privilege to save an app.',
});

const objectType = i18n.translate('xpack.customApp.attachment.objectType', {
  defaultMessage: 'Custom app',
});

interface AppCardProps {
  document: AppDocument;
  /** Apps that came from a panel are already on a dashboard, so only new ones can be saved. */
  canSave: boolean;
  title?: string;
  registerActionButtons?: InlineRenderCallbacks['registerActionButtons'];
}

/** An app in the conversation, live, with the way to put it on a dashboard. */
export const AppCard = ({ document, canSave, title, registerActionButtons }: AppCardProps) => {
  const { core, embeddable } = getServices();
  const canWriteDashboards = core.application.capabilities.dashboard_v2?.showWriteControls === true;
  const canSaveApps = core.application.capabilities.customApp?.save === true;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNamingApp, setIsNamingApp] = useState(false);
  const [isSavingApp, setIsSavingApp] = useState(false);
  /** Once saved, the card says so and opens the saved app, instead of offering to save again. */
  const [savedApp, setSavedApp] = useState<{ id: string; title: string }>();

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const openNaming = useCallback(() => setIsNamingApp(true), []);

  const saveAsApp = useCallback(
    async ({ title: appTitle, description }: { title: string; description?: string }) => {
      setIsSavingApp(true);
      try {
        const saved = await createSavedAppsClient(core.http).create({
          title: appTitle,
          description,
          document,
        });
        setSavedApp({ id: saved.id, title: saved.title });
        setIsNamingApp(false);
      } catch (error) {
        core.notifications.toasts.addDanger({
          title: i18n.translate('xpack.customApp.attachment.saveAsAppError', {
            defaultMessage: 'The app could not be saved',
          }),
          text:
            (error as { body?: { message?: string } })?.body?.message ??
            (error instanceof Error ? error.message : String(error)),
        });
      } finally {
        setIsSavingApp(false);
      }
    },
    [core, document]
  );

  const openSavedApp = useCallback(() => {
    if (!savedApp) return;
    core.application.navigateToApp(CUSTOM_APP_APPLICATION_ID, {
      path: `/view/${encodeURIComponent(savedApp.id)}`,
    });
  }, [core, savedApp]);

  const onSave = useCallback<SaveModalDashboardProps['onSave']>(
    async ({ dashboardId, newTitle, newDescription }) => {
      setIsModalOpen(false);
      await embeddable.getStateTransfer().navigateToWithEmbeddablePackages('dashboards', {
        state: [
          {
            type: CUSTOM_APP_EMBEDDABLE_TYPE,
            serializedState: {
              version: CUSTOM_APP_STATE_VERSION,
              document,
              title: newTitle,
              description: newDescription,
            },
          },
        ],
        path: dashboardId && dashboardId !== 'new' ? `#/view/${dashboardId}` : '#/create',
      });
    },
    [document, embeddable]
  );

  const buttons = useMemo<ActionButton[]>(
    () =>
      canSave
        ? [
            {
              label: saveLabel,
              icon: 'save',
              type: ActionButtonType.PRIMARY,
              disabled: !canWriteDashboards,
              disabledReason: canWriteDashboards ? undefined : noWriteAccessReason,
              handler: openModal,
            },
            savedApp
              ? {
                  label: openAppLabel,
                  icon: 'external',
                  type: ActionButtonType.SECONDARY,
                  handler: openSavedApp,
                }
              : {
                  label: saveAsAppLabel,
                  icon: 'apps',
                  type: ActionButtonType.SECONDARY,
                  disabled: !canSaveApps,
                  disabledReason: canSaveApps ? undefined : noSaveAccessReason,
                  handler: openNaming,
                },
          ]
        : [],
    [canSave, canWriteDashboards, canSaveApps, savedApp, openModal, openNaming, openSavedApp]
  );

  useEffect(() => {
    registerActionButtons?.(buttons);
    return () => registerActionButtons?.([]);
  }, [buttons, registerActionButtons]);

  return (
    <>
      <LiveApp document={document} />
      {savedApp && (
        <EuiCallOut
          announceOnMount
          size="s"
          color="success"
          iconType="check"
          title={i18n.translate('xpack.customApp.attachment.savedAsApp', {
            defaultMessage: 'Saved as "{title}"',
            values: { title: savedApp.title },
          })}
          data-test-subj="customAppSavedAsApp"
        />
      )}
      {isNamingApp && (
        <DetailsModal
          heading={saveAsAppLabel}
          confirmLabel={i18n.translate('xpack.customApp.attachment.saveAsAppConfirm', {
            defaultMessage: 'Save',
          })}
          initialTitle={title}
          isSaving={isSavingApp}
          onConfirm={saveAsApp}
          onCancel={() => setIsNamingApp(false)}
        />
      )}
      {isModalOpen && (
        <SavedObjectSaveModalDashboard
          objectType={objectType}
          documentInfo={{ title: title ?? '' }}
          canSaveByReference={false}
          onClose={closeModal}
          onSave={onSave}
        />
      )}
    </>
  );
};
