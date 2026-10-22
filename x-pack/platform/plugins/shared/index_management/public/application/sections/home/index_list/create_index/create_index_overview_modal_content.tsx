/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { UIM_APP_NAME } from '../../../../../../common/constants/ui_metric';
import { documentationService } from '../../../../services';
import { httpService } from '../../../../services/http';
import { NotificationService } from '../../../../services/notification';
import { UiMetricService } from '../../../../services/ui_metric';
import type { AppDependencies } from '../../../../app_context';
import { IndexManagementAppContext } from '../../../..';
import { CreateIndexModal } from './create_index_modal';
import type { CreateIndexOverviewModalProps } from './create_index_overview_modal';

/** Index Management context plus the create-index modal, for the overview page. */
export const CreateIndexOverviewModalContent = ({
  onClose,
  core,
  dependencies,
}: CreateIndexOverviewModalProps) => {
  // Embedded outside the Index Management app, so the app mount never sets these up.
  // Keep this synchronous: the first create request runs against these singletons.
  if (!httpService.httpClient) {
    httpService.setup(core.http);
  }
  const notificationService = new NotificationService(core.notifications.toasts);
  documentationService.setup(core.docLinks);

  const appDependencies: AppDependencies = {
    ...dependencies,
    services: {
      ...dependencies.services,
      httpService,
      notificationService,
      uiMetricService: new UiMetricService(UIM_APP_NAME),
    },
  };

  return (
    <IndexManagementAppContext core={core} dependencies={appDependencies}>
      <CreateIndexModal closeModal={onClose} loadIndices={() => {}} />
    </IndexManagementAppContext>
  );
};
