/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { Request, ServerRoute } from 'hapi';
import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectReference,
} from 'src/core/server/saved_objects';

type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Installation = SavedObject<InstallationAttributes>;

// the contract with the registry
export type RegistryList = RegistryListItem[];

// registry /list
// https://github.com/elastic/integrations-registry/blob/master/docs/api/list.json
export interface RegistryListItem {
  description: string;
  download: string;
  icon: string;
  name: string;
  version: string;
}

// registry /package/{name}
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

// the public HTTP response types
export type IntegrationList = IntegrationListItem[];

export type IntegrationListItem = Installable<RegistryListItem>;

export type IntegrationInfo = Installable<RegistryPackage>;

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: 'installed';
  savedObject: Installation;
};

export type NotInstalled<T = {}> = T & {
  status: 'not_installed';
};
