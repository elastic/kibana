/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Plugin,
  CoreSetup,
  SavedObjectsClientContract,
  DocLinksStart,
  CoreStart,
  ChromeStart,
} from 'src/core/public';
import { boot } from './application/boot';

interface LegacyPlugins {
  eui_utils: any;
  __LEGACY: {
    MANAGEMENT_BREADCRUMB: { text: string; href?: string };
    I18nContext: any;
    TimeBuckets: any;
    licenseStatus: any;
    savedObjects: SavedObjectsClientContract;
  };
}

export class WatcherUIPlugin implements Plugin<void, void, any, any> {
  docLinks: DocLinksStart | null = null;
  chrome: ChromeStart | null = null;
  setup(
    { application, notifications, http, uiSettings }: CoreSetup,
    { __LEGACY, eui_utils }: LegacyPlugins
  ) {
    application.register({
      id: 'watcher',
      title: 'Watcher',
      mount: (ctx, { element }) => {
        const docLinks = this.docLinks!;
        const chrome = this.chrome!;
        return boot({
          ...__LEGACY,
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          euiUtils: eui_utils,
          docLinks,
          chrome,
        });
      },
    });
  }

  start({ docLinks, chrome }: CoreStart) {
    this.docLinks = docLinks;
    this.chrome = chrome;
  }

  stop() {}
}
