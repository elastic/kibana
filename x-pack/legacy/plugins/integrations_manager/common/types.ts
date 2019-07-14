/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/server';
import { InstallationStatus } from './constants';

export { Request, ResponseToolkit, ServerRoute } from 'hapi';
export { ClusterClient } from 'src/core/server';

export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;

export type Installation = SavedObject<InstallationAttributes>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: InstallationStatus.installed;
  savedObject: Installation;
};

export type NotInstalled<T = {}> = T & {
  status: InstallationStatus.notInstalled;
};

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

// from API_INFO_PATTERN
export type IntegrationInfo = Installable<RegistryPackage>;

// from API_INSTALL_PATTERN
// returns Installation

// from API_DELETE_PATTERN
// returns [ AssetReference ]
// more specifically, [ SavedObjectAttributes['installed'] ]
