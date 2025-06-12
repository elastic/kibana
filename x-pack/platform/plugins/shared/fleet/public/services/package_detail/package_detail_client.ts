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
  async getPackage(
    pkgName: string,
    pkgVersion?: string
  ): Promise<
    Record<
      string,
      Array<{
        title: string;
        entity?: string;
        dashboardId: string;
      }>
    >
  > {
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

    const sideNav = pkg.item.installationInfo?.installed_kibana
      .filter((p) => !!p.sideNavTitle)
      .sort((a, b) => (a.sideNavOrder ?? 0) - (b.sideNavOrder ?? 0));

    if (!sideNav || sideNav.length === 0) {
      return { [pkg.item.name]: [] };
    }

    return {
      [pkg.item.name]:
        sideNav.map((kibana) => {
          return {
            title: kibana.sideNavTitle ?? 'missing title',
            entity: kibana.entity,
            dashboardId: kibana.id,
          };
        }) ?? [],
    };
  }
}
