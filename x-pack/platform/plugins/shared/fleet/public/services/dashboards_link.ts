/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Ast, Query } from '@elastic/eui';

import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import type { IBasePath } from '@kbn/core-http-browser';

import type { InstallationInfo } from '../../common/types/models';
import { KibanaSavedObjectType } from '../../common/types/models';

/**
 * Returns the number of dashboards installed for a package in a given space.
 * Mirrors the DashboardsCell logic on the Installed Integrations page.
 */
export function getDashboardsCount(
  installationInfo: InstallationInfo,
  spaceId: string = DEFAULT_SPACE_ID
): number {
  const assets =
    installationInfo.installed_kibana_space_id === spaceId
      ? installationInfo.installed_kibana
      : installationInfo?.additional_spaces_installed_kibana?.[spaceId];

  if (!assets || assets.length === 0) {
    return 0;
  }

  return assets.filter(({ type }) => type === KibanaSavedObjectType.dashboard).length;
}

/**
 * Builds a link to the Kibana Dashboards listing page pre-filtered by the
 * integration's package title tag.
 *
 * Note: this couples to the Dashboards app's #/list route and the package-title
 * tagging convention — a pre-existing pattern used by the Installed Integrations
 * page (DashboardsCell). Not using dashboardLocator because that only supports
 * linking to a single dashboard by id, not to the filtered listing.
 */
export function buildDashboardsListLink(basePath: IBasePath, packageTitle: string): string {
  const ast = Ast.create([]);
  const packageTagQueryClause = new Query(ast.addOrFieldValue('tag', packageTitle, true, 'eq'))
    .text;
  return basePath.prepend(`/app/dashboards#/list?s=${packageTagQueryClause}`);
}
