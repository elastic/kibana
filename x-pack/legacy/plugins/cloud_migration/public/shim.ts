/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n/react';
import { I18nContext } from 'ui/i18n';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { HashRouter } from 'react-router-dom';

export interface Core {
  i18n: {
    [key: string]: any;
    Context: typeof I18nContext;
    FormattedMessage: typeof FormattedMessage;
    FormattedDate: typeof FormattedDate;
    FormattedTime: typeof FormattedTime;
  };
  chrome: typeof chrome;
  http: {
    client: {
      get(): ng.IHttpService;
      set(client: ng.IHttpService): void;
    };
  };
  router: {
    angular: {
      registerRoute(path: string, config: object): void;
    };
    react: {
      get(): HashRouter;
      set(router: HashRouter): void;
    };
  };
}

export interface Plugins {
  management: {
    sections: typeof management;
    BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
  };
}

export const createShim = (): { core: Core; plugins: Plugins } => {
  let httpClient: ng.IHttpService;
  let reactRouter: HashRouter;

  const core: Core = {
    i18n: {
      ...i18n,
      Context: I18nContext,
      FormattedMessage,
      FormattedDate,
      FormattedTime,
    },
    chrome,
    http: {
      client: {
        get() {
          return httpClient!;
        },
        set(client) {
          httpClient = client;
        },
      },
    },
    router: {
      angular: {
        registerRoute(path: string, config: object) {
          routes.when(path, config);
        },
      },
      react: {
        get() {
          return reactRouter;
        },
        set(router: HashRouter) {
          reactRouter = router;
        },
      },
    },
  };

  const plugins: Plugins = {
    management: {
      BREADCRUMB: MANAGEMENT_BREADCRUMB,
      sections: management,
    },
  };

  return { core, plugins };
};
