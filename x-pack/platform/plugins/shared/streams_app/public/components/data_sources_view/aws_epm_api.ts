/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';

/** Mirrors {@link epmRouteService.getFilePath} from Fleet. */
export const getEpmPackageFileApiPath = (filePath: string): string =>
  `/api/fleet/epm/packages${filePath.replace('/package', '')}`;

export const getEpmPackageInfoApiPath = (pkgName: string, pkgVersion?: string): string =>
  pkgVersion
    ? `/api/fleet/epm/packages/${pkgName}/${pkgVersion}`
    : `/api/fleet/epm/packages/${pkgName}`;

export interface AwsEpmPackageIcon {
  readonly src?: string;
  readonly path?: string;
}

export interface AwsEpmPackageScreenshot {
  readonly src?: string;
  readonly path?: string;
  readonly title?: string;
}

export interface AwsEpmPackageAssetPart {
  readonly file?: string;
}

export interface AwsEpmPackageInfo {
  readonly name: string;
  readonly version: string;
  readonly readme?: string;
  readonly icons?: readonly AwsEpmPackageIcon[];
  readonly screenshots?: readonly AwsEpmPackageScreenshot[];
  readonly categories?: readonly string[];
  readonly assets?: Readonly<
    Record<string, Readonly<Record<string, readonly AwsEpmPackageAssetPart[]>>>
  >;
  readonly data_streams?: ReadonlyArray<{ readonly type?: string; readonly ingest_pipeline?: string }>;
  readonly conditions?: Readonly<{ readonly elastic?: Readonly<{ readonly subscription?: string }> }>;
  readonly owner?: Readonly<{ readonly github?: string }>;
}

export interface AwsEpmPackageInfoResponse {
  readonly item: AwsEpmPackageInfo;
}

export const toEpmPackageImageUrl = (
  http: HttpSetup,
  pkgName: string,
  pkgVersion: string,
  image: AwsEpmPackageIcon | AwsEpmPackageScreenshot
): string | undefined => {
  const sourcePath = image.src
    ? `/package/${pkgName}/${pkgVersion}${image.src}`
    : image.path;

  if (!sourcePath) {
    return undefined;
  }

  return http.basePath.prepend(getEpmPackageFileApiPath(sourcePath));
};
