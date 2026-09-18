/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PLUGIN_NAME } from '../common';

const description = i18n.translate('xpack.esqlViews.managementPage.description', {
  defaultMessage: 'Create and manage ES|QL views.',
});

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, setBreadcrumbs }: ManagementAppMountParams
) => {
  const { docTitle } = coreStart.chrome;
  docTitle.change(PLUGIN_NAME);
  setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <EuiEmptyPrompt
        data-test-subj="esqlViewsManagementPage"
        iconType="inspect"
        title={<h1>{PLUGIN_NAME}</h1>}
        body={<p>{description}</p>}
      />
    )
  );

  return () => {
    docTitle.reset();
    root.unmount();
  };
};
