/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppUnmount, CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { AgenticAnalysisSettingsPage } from '../pages/settings/agentic_analysis_settings_page';

export const mountSettingsApp = async ({
  params,
  coreStart,
}: {
  params: ManagementAppMountParams;
  coreStart: CoreStart;
}): Promise<AppUnmount> => {
  const { element } = params;

  ReactDOM.render(
    coreStart.rendering.addContext(
      <AgenticAnalysisSettingsPage
        http={coreStart.http}
        notifications={coreStart.notifications}
      />
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};
