/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  ChromeBreadcrumb,
  CoreSetup,
  Plugin,
  PluginInitializerContext,
  DocLinksStart,
} from 'src/core/public';

import { IndexMgmtSetup } from '../../../../../plugins/index_management/public';

// @ts-ignore;
import { setHttpClient } from './app/services/api';
import { setBreadcrumbSetter } from './app/services/breadcrumbs';
import { setDocLinks } from './app/services/documentation_links';
import { setNotifications } from './app/services/notifications';
import { extendIndexManagement } from './extend_index_management';

interface PluginDependencies {
  indexManagement: IndexMgmtSetup;
  __LEGACY: {
    chrome: any;
    MANAGEMENT_BREADCRUMB: ChromeBreadcrumb;
    docLinks: DocLinksStart;
  };
}

export class CrossClusterReplicationUIPlugin implements Plugin {
  // @ts-ignore
  constructor(private readonly ctx: PluginInitializerContext) {}
  setup({ http, notifications, fatalErrors }: CoreSetup, deps: PluginDependencies) {
    setHttpClient(http);
    setBreadcrumbSetter(deps);
    setDocLinks(deps.__LEGACY.docLinks);
    setNotifications(notifications, fatalErrors);
    extendIndexManagement(deps.indexManagement);
  }

  start() {}
}
