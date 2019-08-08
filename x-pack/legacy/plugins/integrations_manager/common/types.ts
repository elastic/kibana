/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/server';

export { Request, ResponseToolkit, ServerRoute } from 'hapi';

const INSTALLED = 'installed';
const NOT_INSTALLED = 'not_installed';
export type InstallationStatus = typeof INSTALLED | typeof NOT_INSTALLED;

export type AssetType =
  | 'config'
  | 'dashboard'
  | 'index-pattern'
  | 'ingest-pipeline'
  | 'search'
  | 'timelion-sheet'
  | 'visualization';

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
export type ServiceName = 'kibana' | 'elasticsearch' | 'filebeat' | 'metricbeat';
export type RequirementVersionValue = string;
export interface RequirementGroup {
  'version.min': RequirementVersionValue;
  'version.max': RequirementVersionValue;
}

export type RequirementMap = Record<ServiceName, RequirementGroup>;
export interface AssetParts {
  pkgkey: string;
  service: ServiceName;
  type: AssetType;
  file: string;
}

export type AssetsGroupedByServiceByType = Record<ServiceName, Record<AssetType, AssetParts[]>>;
export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  icon: string;
  requirement: RequirementMap;
}

// Managers public HTTP response types
// from API_LIST_PATTERN
export type IntegrationList = IntegrationListItem[];
// add title here until it's a part of registry response
export type IntegrationListItem = Installable<RegistryListItem & { title: string }>;
export type IntegrationsGroupedByStatus = Record<InstallationStatus, IntegrationList>;

// from API_INFO_PATTERN
// add title here until it's a part of registry response
export type IntegrationInfo = Installable<
  RegistryPackage & { assets: AssetsGroupedByServiceByType; title: string }
>;

// from API_INSTALL_PATTERN
// returns Installation
export type Installation = SavedObject<InstallationAttributes>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: typeof INSTALLED;
  savedObject: Installation;
};

export type NotInstalled<T = {}> = T & {
  status: typeof NOT_INSTALLED;
};

// from API_DELETE_PATTERN
// returns InstallationAttributes['installed']
export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
