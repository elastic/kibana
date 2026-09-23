/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import type { CoreStart } from '@kbn/core/public';
import { createEsqlViewsManagementClient } from '@kbn/esql-utils';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PLUGIN_NAME } from '../common';
import { ManagementApp } from './management_app';

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, setBreadcrumbs }: ManagementAppMountParams
) => {
  const { docTitle } = coreStart.chrome;
  docTitle.change(PLUGIN_NAME);
  setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const client = createEsqlViewsManagementClient(coreStart.http);
  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <ManagementApp
        client={client}
        documentationUrl={coreStart.docLinks.links.query.queryESQLViews}
      />
    )
  );

  return () => {
    docTitle.reset();
    root.unmount();
  };
};
