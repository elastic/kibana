/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectAttributes, SavedObjectReference } from 'src/core/server';

export { Request, ResponseToolkit, Server, ServerRoute } from 'hapi';

export type InstallationStatus = Installed['status'] | NotInstalled['status'];

export type AssetType = KibanaAssetType | ElasticsearchAssetType;

export type KibanaAssetType = 'dashboard' | 'visualization' | 'search' | 'index-pattern';

export type ElasticsearchAssetType = 'ingest-pipeline' | 'index-template' | 'ilm-policy';

// Registry's response types
// from /search
// https://github.com/elastic/integrations-registry/blob/master/docs/api/search.json
export type RegistryList = RegistryListItem[];
export interface RegistryListItem {
  description: string;
  download: string;
  icon: string;
  name: string;
  version: string;
  title?: string;
}

export interface ScreenshotItem {
  src: string;
  title?: string;
}

// from /package/{name}
// https://github.com/elastic/integrations-registry/blob/master/docs/api/package.json
export type ServiceName = 'kibana' | 'elasticsearch';
export type RequirementVersion = string;

export interface ServiceRequirements {
  version: RequirementVersionRange;
}

export interface RequirementVersionRange {
  min: RequirementVersion;
  max: RequirementVersion;
}

// from /categories
// https://github.com/elastic/integrations-registry/blob/master/docs/api/categories.json
export type CategorySummaryList = CategorySummaryItem[];
export type CategoryId = string;
export interface CategorySummaryItem {
  id: CategoryId;
  title: string;
  count: number;
}

export type RequirementsByServiceName = Record<ServiceName, ServiceRequirements>;
export interface AssetParts {
  pkgkey: string;
  service: ServiceName;
  type: AssetType;
  file: string;
}
export type Assets = Record<AssetType, AssetParts[]>;
export type AssetsGroupedByServiceByType = Record<ServiceName, Assets>;
export interface RegistryPackage {
  name: string;
  version: string;
  description: string;
  readme?: string;
  icon: string;
  requirement: RequirementsByServiceName;
  title?: string;
  screenshots?: ScreenshotItem[];
  assets: string[];
}

// Managers public HTTP response types
// from API_LIST_PATTERN
export type PackageList = PackageListItem[];
// add title here until it's a part of registry response
export type PackageListItem = Installable<Required<RegistryListItem>>;
export type PackagesGroupedByStatus = Record<InstallationStatus, PackageList>;

// from API_INFO_PATTERN
// add title here until it's a part of registry response
export type PackageInfo = Installable<
  Required<RegistryPackage> & { assets: AssetsGroupedByServiceByType }
>;

// from API_INSTALL_PATTERN
// returns Installation
export type Installation = SavedObject<InstallationAttributes>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Installable<T> = Installed<T> | NotInstalled<T>;

export type Installed<T = {}> = T & {
  status: 'installed';
  savedObject: Installation;
};

export type NotInstalled<T = {}> = T & {
  status: 'not_installed';
};

// from API_DELETE_PATTERN
// returns InstallationAttributes['installed']
export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
