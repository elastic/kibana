/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { npStart } from 'ui/new_platform';

import chrome from 'ui/chrome';
import { docTitle } from 'ui/doc_title/doc_title';

// @ts-ignore: allow traversal to fail on x-pack build
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

import { TRANSFORM_DOC_PATHS } from './app/constants';
import { SavedSearchLoader } from '../../../../../src/plugins/discover/public';

export type NpCore = typeof npStart.core;
export type NpPlugins = typeof npStart.plugins;

// AppCore/AppPlugins is the set of core features/plugins
// we pass on via context/hooks to the app and its components.
export type AppCore = Pick<
  ShimCore,
  | 'chrome'
  | 'documentation'
  | 'docLinks'
  | 'http'
  | 'i18n'
  | 'injectedMetadata'
  | 'savedObjects'
  | 'uiSettings'
  | 'overlays'
  | 'notifications'
>;
export type AppPlugins = Pick<ShimPlugins, 'data' | 'management' | 'savedSearches' | 'xsrfToken'>;

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export interface ShimCore extends NpCore {
  documentation: Record<
    | 'esDocBasePath'
    | 'esIndicesCreateIndex'
    | 'esPluginDocBasePath'
    | 'esQueryDsl'
    | 'esStackOverviewDocBasePath'
    | 'esTransform'
    | 'esTransformPivot'
    | 'mlDocBasePath',
    string
  >;
  docTitle: {
    change: typeof docTitle.change;
  };
}

export interface ShimPlugins extends NpPlugins {
  uiMetric: {
    createUiStatsReporter: typeof createUiStatsReporter;
  };
  savedSearches: {
    getClient(): any;
    setClient(client: any): void;
  };
  xsrfToken: string;
}

export function createPublicShim(): { core: ShimCore; plugins: ShimPlugins } {
  // This is an Angular service, which is why we use this provider pattern
  // to access it within our React app.
  let savedSearches: SavedSearchLoader;

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = npStart.core.docLinks;

  return {
    core: {
      ...npStart.core,
      documentation: {
        esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
        esIndicesCreateIndex: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/indices-create-index.html#indices-create-index`,
        esPluginDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`,
        esQueryDsl: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/query-dsl.html`,
        esStackOverviewDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/`,
        esTransform: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/${TRANSFORM_DOC_PATHS.transforms}`,
        esTransformPivot: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/put-transform.html#put-transform-request-body`,
        mlDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/`,
      },
      docTitle: {
        change: docTitle.change,
      },
    },
    plugins: {
      ...npStart.plugins,
      savedSearches: {
        setClient: (client: any): void => {
          savedSearches = client;
        },
        getClient: (): any => savedSearches,
      },
      uiMetric: {
        createUiStatsReporter,
      },
      xsrfToken: chrome.getXsrfToken(),
    },
  };
}
