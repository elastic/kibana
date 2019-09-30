/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedDate, FormattedTime } from '@kbn/i18n/react';
import { I18nContext } from 'ui/i18n';

import chrome from 'ui/chrome';
import { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } from 'ui/documentation_links';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { fatalError, toastNotifications } from 'ui/notify';
import routes from 'ui/routes';
import { docTitle } from 'ui/doc_title/doc_title';

import { HashRouter } from 'react-router-dom';

// @ts-ignore: allow traversal to fail on x-pack build
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';
import { SavedSearchLoader } from '../../../../../src/legacy/core_plugins/kibana/public/discover/types';

export interface AppCore {
  i18n: {
    [i18nPackage: string]: any;
    Context: typeof I18nContext;
    FormattedMessage: typeof FormattedMessage;
    FormattedDate: typeof FormattedDate;
    FormattedTime: typeof FormattedTime;
  };
  notification: {
    fatalError: typeof fatalError;
    toastNotifications: typeof toastNotifications;
  };
  savedSearches: {
    getClient(): any;
    setClient(client: any): void;
  };
}

export interface AppPlugins {
  management: {
    sections: typeof management;
  };
}

export interface Core extends AppCore {
  chrome: typeof chrome;
  http: {
    getClient(): any;
    setClient(client: any): void;
  };
  routing: {
    registerAngularRoute(path: string, config: object): void;
    registerRouter(router: HashRouter): void;
    getRouter(): HashRouter | undefined;
  };
  documentation: {
    esDocBasePath: string;
    esPluginDocBasePath: string;
    esStackOverviewDocBasePath: string;
  };
  docTitle: {
    change: typeof docTitle.change;
  };
}

export interface Plugins extends AppPlugins {
  management: {
    sections: typeof management;
    constants: {
      BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
    };
  };
  uiMetric: {
    createUiStatsReporter: typeof createUiStatsReporter;
  };
}

export function createShim(): { core: Core; plugins: Plugins } {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let httpClient: ng.IHttpService;
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let savedSearches: SavedSearchLoader;

  let reactRouter: HashRouter | undefined;

  return {
    core: {
      i18n: {
        ...i18n,
        Context: I18nContext,
        FormattedMessage,
        FormattedDate,
        FormattedTime,
      },
      routing: {
        registerAngularRoute: (path: string, config: object): void => {
          routes.when(path, config);
        },
        registerRouter: (router: HashRouter): void => {
          reactRouter = router;
        },
        getRouter: (): HashRouter | undefined => {
          return reactRouter;
        },
      },
      http: {
        setClient: (client: any): void => {
          httpClient = client;
        },
        getClient: (): any => httpClient,
      },
      chrome,
      notification: {
        fatalError,
        toastNotifications,
      },
      documentation: {
        esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
        esPluginDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`,
        esStackOverviewDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/`,
      },
      docTitle: {
        change: docTitle.change,
      },
      savedSearches: {
        setClient: (client: any): void => {
          savedSearches = client;
        },
        getClient: (): any => savedSearches,
      },
    },
    plugins: {
      management: {
        sections: management,
        constants: {
          BREADCRUMB: MANAGEMENT_BREADCRUMB,
        },
      },
      uiMetric: {
        createUiStatsReporter,
      },
    },
  };
}
