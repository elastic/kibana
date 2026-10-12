/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { getServices } from '../services';
import { RenderApp } from './render_app';

const saveLabel = i18n.translate('xpack.customApp.attachment.saveToDashboard', {
  defaultMessage: 'Save to dashboard',
});

const noWriteAccessReason = i18n.translate('xpack.customApp.attachment.noWriteAccess', {
  defaultMessage: 'You need dashboard write permissions to save an app to a dashboard.',
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

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
          ]
        : [],
    [canSave, canWriteDashboards, openModal]
  );

  useEffect(() => {
    registerActionButtons?.(buttons);
    return () => registerActionButtons?.([]);
  }, [buttons, registerActionButtons]);

  return (
    <>
      <RenderApp document={document} />
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
