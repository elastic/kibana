/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/server';
import {
  ASSET_TYPE_CONFIG,
  ASSET_TYPE_DASHBOARD,
  ASSET_TYPE_INGEST_PIPELINE,
  ASSET_TYPE_INDEX_PATTERN,
  ASSET_TYPE_SEARCH,
  ASSET_TYPE_TIMELION_SHEET,
  ASSET_TYPE_VISUALIZATION,
  STATUS_INSTALLED,
  STATUS_NOT_INSTALLED,
} from './constants';

export { Request, ResponseToolkit, ServerRoute } from 'hapi';

export type InstallationStatus = typeof STATUS_INSTALLED | typeof STATUS_NOT_INSTALLED;

export type AssetType =
  | typeof ASSET_TYPE_CONFIG
  | typeof ASSET_TYPE_DASHBOARD
  | typeof ASSET_TYPE_INDEX_PATTERN
  | typeof ASSET_TYPE_INGEST_PIPELINE
  | typeof ASSET_TYPE_SEARCH
  | typeof ASSET_TYPE_TIMELION_SHEET
  | typeof ASSET_TYPE_VISUALIZATION;

// Registry's response types
// from /list
// https://github.com/elastic/integrations-registry/blob/master/docs/api/list.json
export type RegistryList = RegistryListItem[];
export interface RegistryListItem {
  description: string;
  download: string;
  icon: string;
  name: string;
  version: string;
}

// from /package/{name}
// https://github.com/elastic/integrations-registry/blob/master/docs/api/package.json
export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  icon: string;
  requirement: {
    kibana: {
      min: string;
      max: string;
    };
  };
}

// Managers public HTTP response types
// from API_LIST_PATTERN
export type IntegrationList = IntegrationListItem[];
export type IntegrationListItem = Installable<RegistryListItem>;
export type IntegrationsGroupedByStatus = {
  [key in InstallationStatus]: IntegrationList;
};

// from API_INFO_PATTERN
export type IntegrationInfo = Installable<RegistryPackage>;

// from API_INSTALL_PATTERN
// returns Installation
export type Installation = SavedObject<InstallationAttributes>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: typeof STATUS_INSTALLED;
  savedObject: Installation;
};

export type NotInstalled<T = {}> = T & {
  status: typeof STATUS_NOT_INSTALLED;
};

// from API_DELETE_PATTERN
// returns InstallationAttributes['installed']
export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
