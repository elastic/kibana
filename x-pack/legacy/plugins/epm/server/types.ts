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

import {
  AssetsGroupedByServiceByType,
  InstallationStatus,
  RegistryListItem,
  RequirementsByServiceName,
  ScreenshotItem,
} from '../common/types';

export { Request, ResponseToolkit, Server, ServerRoute } from 'hapi';

// add title here until it's a part of registry response
export type PackageListItem = Installable<Required<RegistryListItem>>;
export type PackagesGroupedByStatus = Record<InstallationStatus, PackageList>;

// add title here until it's a part of registry response
export type PackageInfo = Installable<
  Required<RegistryPackage> & { assets: AssetsGroupedByServiceByType }
>;

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
