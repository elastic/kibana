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
  __LEGACY: {
    MANAGEMENT_BREADCRUMB: { text: string; href?: string };
    I18nContext: any;
    TimeBuckets: any;
    licenseStatus: any;
    savedObjects: SavedObjectsClientContract;
  };
}

export class WatcherUIPlugin implements Plugin<void, void, LegacyPlugins, any> {
  docLinks: DocLinksStart | null = null;
  chrome: ChromeStart | null = null;
  euiUtils: any = null;
  setup({ application, notifications, http, uiSettings }: CoreSetup, { __LEGACY }: LegacyPlugins) {
    application.register({
      id: 'watcher',
      title: 'Watcher',
      mount: (ctx, { element }) => {
        const docLinks = this.docLinks!;
        const chrome = this.chrome!;
        const euiUtils = this.euiUtils!;
        return boot({
          ...__LEGACY,
          element,
          toasts: notifications.toasts,
          http,
          uiSettings,
          euiUtils,
          docLinks,
          chrome,
        });
      },
    });
  }

  start({ docLinks, chrome }: CoreStart, { eui_utils }: any) {
    this.docLinks = docLinks;
    this.chrome = chrome;
    // eslint-disable-next-line @typescript-eslint/camelcase
    this.euiUtils = eui_utils;
  }

  stop() {}
}
