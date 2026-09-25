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
import { ESQL_VIEWS_CAPABILITIES, PLUGIN_ID, PLUGIN_NAME } from '../common';
import { ManagementApp } from './management_app';

const LazyEsqlEditor = React.lazy(async () => {
  const { ESQLLangEditor } = await import('@kbn/esql/public');
  return { default: ESQLLangEditor };
});

export const mountManagementSection = (
  coreStart: CoreStart,
  { element, setBreadcrumbs }: ManagementAppMountParams
) => {
  const { docTitle } = coreStart.chrome;
  docTitle.change(PLUGIN_NAME);
  setBreadcrumbs([{ text: PLUGIN_NAME }]);

  const client = createEsqlViewsManagementClient(coreStart.http);
  const capabilities = coreStart.application.capabilities[PLUGIN_ID];
  const root = createRoot(element);
  root.render(
    coreStart.rendering.addContext(
      <ManagementApp
        canCreate={capabilities?.[ESQL_VIEWS_CAPABILITIES.create] === true}
        canEdit={capabilities?.[ESQL_VIEWS_CAPABILITIES.edit] === true}
        client={client}
        documentationUrl={coreStart.docLinks.links.query.queryESQLViews}
        EsqlEditor={LazyEsqlEditor}
      />
    )
  );

  return () => {
    docTitle.reset();
    root.unmount();
  };
};
