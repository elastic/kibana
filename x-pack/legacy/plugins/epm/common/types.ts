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

export type ServiceName = 'kibana' | 'elasticsearch';
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

// from /package/{name}
// type Package struct at https://github.com/elastic/package-registry/blob/master/util/package.go
// https://github.com/elastic/package-registry/blob/master/docs/api/package.json
export interface RegistryPackage {
  name: string;
  title?: string;
  version: string;
  readme?: string;
  description: string;
  type: string;
  categories: string[];
  requirement: RequirementsByServiceName;
  screenshots?: ScreenshotItem[];
  icons?: string[];
  assets?: string[];
  internal?: boolean;
  format_version: string;
  datasets?: Dataset[];
  download: string;
  path: string;
}

export type RequirementVersion = string;
export type RequirementVersionRange = string;
export interface ServiceRequirements {
  versions: RequirementVersionRange;
}

// Registry's response types
// from /search
// https://github.com/elastic/package-registry/blob/master/docs/api/search.json
export type RegistryList = RegistryListItem[];
// from getPackageOutput at https://github.com/elastic/package-registry/blob/master/search.go
export type RegistryListItem = Pick<
  RegistryPackage,
  'name' | 'title' | 'version' | 'description' | 'type' | 'icons' | 'internal' | 'download' | 'path'
>;

export interface ScreenshotItem {
  src: string;
  title?: string;
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

export interface Dataset {
  title: string;
  name: string;
  release: string;
  ingeset_pipeline: string;
  vars: object[];
  type: string;
  package: string;
}

// some properties are optional in Registry responses but required in EPM
// internal until we need them
interface PackageAdditions {
  title: string;
  assets: AssetsGroupedByServiceByType;
}
export interface RegistryPackage {
  name: string;
  title?: string;
  version: string;
  readme?: string;
  description: string;
  categories: string[];
  requirement: RequirementsByServiceName;
  screenshots?: ScreenshotItem[];
  icons?: string[];
  assets?: string[];
  internal?: boolean;
  format_version: string;
  datasets?: Dataset[];
  download: string;
  path: string;
}

// Managers public HTTP response types
export type PackageList = PackageListItem[];

export type PackageListItem = Installable<RegistryListItem & PackageAdditions>;
export type PackagesGroupedByStatus = Record<InstallationStatus, PackageList>;
export type PackageInfo = Installable<RegistryPackage & PackageAdditions>;

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

export type AssetReference = Pick<SavedObjectReference, 'id' | 'type'>;
