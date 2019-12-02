/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObject,
  SavedObjectAttributes,
  SavedObjectReference,
} from '../../../../../src/core/server';

export enum InstallationStatus {
  installed = 'installed',
  notInstalled = 'not_installed',
}

export type AssetType = KibanaAssetType | ElasticsearchAssetType;

export enum KibanaAssetType {
  dashboard = 'dashboard',
  visualization = 'visualization',
  search = 'search',
  indexPattern = 'index-pattern',
}

export enum ElasticsearchAssetType {
  ingestPipeline = 'ingest-pipeline',
  indexTemplate = 'index-template',
  ilmPolicy = 'ilm-policy',
}

// Registry's response types
// from /search
// https://github.com/elastic/package-registry/blob/master/docs/api/search.json
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

export type ServiceName = 'kibana' | 'elasticsearch';

// from /package/{name}
// https://github.com/elastic/package-registry/blob/master/docs/api/package.json
export type RequirementVersion = string;
export type RequirementVersionRange = string;
export interface ServiceRequirements {
  versions: RequirementVersionRange;
}

// from /categories
// https://github.com/elastic/package-registry/blob/master/docs/api/categories.json
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
  dataset?: string;
  service: ServiceName;
  type: AssetType;
  file: string;
}
export type AssetTypeToParts = KibanaAssetTypeToParts & ElasticsearchAssetTypeToParts;
export type AssetsGroupedByServiceByType = Record<
  Extract<ServiceName, 'kibana'>,
  KibanaAssetTypeToParts
>;
// & Record<Extract<ServiceName, 'elasticsearch'>, ElasticsearchAssetTypeToParts>;

export type KibanaAssetParts = AssetParts & {
  service: Extract<ServiceName, 'kibana'>;
  type: KibanaAssetType;
};

export type ElasticsearchAssetParts = AssetParts & {
  service: Extract<ServiceName, 'elasticsearch'>;
  type: ElasticsearchAssetType;
};

export type KibanaAssetTypeToParts = Record<KibanaAssetType, KibanaAssetParts[]>;
export type ElasticsearchAssetTypeToParts = Record<
  ElasticsearchAssetType,
  ElasticsearchAssetParts[]
>;

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
export type PackageList = PackageListItem[];

export type PackageListItem = Installable<Required<RegistryListItem>>;
export type PackagesGroupedByStatus = Record<InstallationStatus, PackageList>;

export type PackageInfo = Installable<
  Required<RegistryPackage> & { assets: AssetsGroupedByServiceByType }
>;

export type Installation = SavedObject<InstallationAttributes>;
export interface InstallationAttributes extends SavedObjectAttributes {
  installed: AssetReference[];
}

export type Datasource = SavedObject<DatasourceAttributes>;
export interface DatasourceAttributes extends SavedObjectAttributes {
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

export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
