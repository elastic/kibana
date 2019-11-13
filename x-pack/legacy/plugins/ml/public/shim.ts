/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { validateIndexPattern } from 'ui/index_patterns';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { npStart } from 'ui/new_platform';
import { toastNotifications } from 'ui/notify';
import {
  FeatureCatalogueCategory,
  FeatureCatalogueRegistryProvider,
} from 'ui/registry/feature_catalogue';
// @ts-ignore: could not find declaration file for module
import { fieldFormats } from 'ui/registry/field_formats';
// @ts-ignore: could not find declaration file for module
import { addSystemApiHeader } from 'ui/system_api';
// EVentually will come from data plugin.
import { timefilter } from 'ui/timefilter';

export type npCore = typeof npStart.core;

// AppCore/AppPlugins is the set of core features/plugins
// we pass on via context/hooks to the app and its components.
export type AppCore = Pick<npCore, 'chrome' | 'i18n'>;

export interface AppPlugins {
  management: {
    sections: typeof management;
  };
}

export interface AppDependencies {
  core: AppCore;
  plugins: AppPlugins;
}

export interface Core extends AppCore {
  addSystemApiHeader: typeof addSystemApiHeader;
  documentation: {
    elasticWebsiteUrl: string;
    esDocBasePath: string;
    esStackOverviewDocBasePath: string;
    kibanaDocBasePath: string;
  };
  indexPatterns: {
    validateIndexPattern: typeof validateIndexPattern;
  };
  notification: {
    toastNotifications: typeof toastNotifications;
  };
  registry: {
    featureCatalogue: {
      category: typeof FeatureCatalogueCategory;
      registryProvider: typeof FeatureCatalogueRegistryProvider;
    };
    fieldFormats: typeof fieldFormats;
  };
  timefilter: typeof timefilter;
}

export interface Plugins extends AppPlugins {
  management: {
    sections: typeof management;
    constants: {
      BREADCRUMB: typeof MANAGEMENT_BREADCRUMB;
    };
  };
}

export function createPublicShim(): { core: Core; plugins: Plugins } {
  const { DOC_LINK_VERSION, ELASTIC_WEBSITE_URL } = npStart.core.docLinks;

  return {
    core: {
      ...npStart.core,
      addSystemApiHeader,
      indexPatterns: {
        validateIndexPattern,
      },
      notification: {
        toastNotifications,
      },
      registry: {
        featureCatalogue: {
          category: FeatureCatalogueCategory,
          registryProvider: FeatureCatalogueRegistryProvider,
        },
        fieldFormats,
      },
      timefilter,
      documentation: {
        elasticWebsiteUrl: ELASTIC_WEBSITE_URL,
        esDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`,
        esStackOverviewDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-overview/${DOC_LINK_VERSION}/`,
        kibanaDocBasePath: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/`,
      },
    },
    plugins: {
      management: {
        sections: management,
        constants: {
          BREADCRUMB: MANAGEMENT_BREADCRUMB,
        },
      },
    },
  };
}
