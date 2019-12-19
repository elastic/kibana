/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import routes from 'ui/routes';
import { docTitle } from 'ui/doc_title/doc_title';

// @ts-ignore: allow traversal to fail on x-pack build
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';
import { SavedSearchLoader } from '../../../../../src/legacy/core_plugins/kibana/public/discover/types';

export type npCore = typeof npStart.core;

// AppCore/AppPlugins is the set of core features/plugins
// we pass on via context/hooks to the app and its components.
export type AppCore = Pick<npCore, 'chrome' | 'http' | 'i18n' | 'savedObjects' | 'uiSettings'>;

export interface AppPlugins {
  management: {
    sections: typeof management;
  };
  savedSearches: {
    getClient(): any;
    setClient(client: any): void;
  };
}

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export interface Core extends npCore {
  legacyHttp: {
    getClient(): any;
    setClient(client: any): void;
  };
  routing: {
    registerAngularRoute(path: string, config: object): void;
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

export function createPublicShim(): { core: Core; plugins: Plugins } {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let httpClient: ng.IHttpService;
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let savedSearches: SavedSearchLoader;

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = npStart.core.docLinks;

  return {
    core: {
      ...npStart.core,
      routing: {
        registerAngularRoute: (path: string, config: object): void => {
          routes.when(path, config);
        },
      },
      legacyHttp: {
        setClient: (client: any): void => {
          httpClient = client;
        },
        getClient: (): any => httpClient,
      },
      documentation: {
        esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
        esPluginDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`,
        esStackOverviewDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/`,
        esMLDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/`,
      },
      docTitle: {
        change: docTitle.change,
      },
    },
    plugins: {
      management: {
        sections: management,
        constants: {
          BREADCRUMB: MANAGEMENT_BREADCRUMB,
        },
      },
      savedSearches: {
        setClient: (client: any): void => {
          savedSearches = client;
        },
        getClient: (): any => savedSearches,
      },
      uiMetric: {
        createUiStatsReporter,
      },
    },
  };
}
