/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';

import { API_VERSIONS, epmRouteService, type GetInfoResponse } from '../../../common';

import type { IPackageDetailClient } from './types';

export class PackageDetailClient implements IPackageDetailClient {
  constructor(private readonly http: HttpStart) {}
  async getPackage(pkgName: string, pkgVersion?: string): Promise<Record<string, string[]>> {
    const pkg = await this.http.fetch<GetInfoResponse>(
      epmRouteService.getInfoPath(pkgName, pkgVersion),
      {
        headers: {
          [ELASTIC_HTTP_VERSION_HEADER]: API_VERSIONS.public.v1,
        },
        version: API_VERSIONS.public.v1,
        signal: new AbortController().signal,
      }
    );

    return {
      [pkg.item.name]: pkg.item.installationInfo?.installed_kibana.map((kibana) => kibana.id) ?? [],
    };
  }
}
