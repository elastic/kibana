/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: collapse integration groups (packages with `schemas`) and their child integrations
// into one tile each.

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { installationStatuses } from '../../../../../../../../common/constants';
import {
  getGroupSchemaChildren,
  getSchemaLabel,
  isGroupPackage,
} from '../../../../../../../../common/services/group_packages';
import type { PackageListItem } from '../../../../../types';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../../../../../constants';
import { mapToCard } from '../card_utils';
import type { IntegrationCardItem } from '../card_utils';

const isEprPackage = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
  item.type !== 'ui_link';

/** Schemas whose child integration is installed, e.g. ['ecs', 'otel']. Derived, never stored. */
export const getInstalledGroupSchemas = (
  group: PackageListItem,
  allItems: Array<PackageListItem | CustomIntegration>
): string[] => {
  const installedNames = new Set(
    allItems
      .filter(isEprPackage)
      .filter((item) => item.installationInfo?.install_status === installationStatuses.Installed)
      .map((item) => item.name)
  );
  return [
    ...new Set(
      getGroupSchemaChildren(group)
        .filter((child) => installedNames.has(child.package))
        .map((child) => child.schema)
    ),
  ];
};

export const getGroupInstalledLabel = (schemas: string[]) =>
  schemas.length ? `Installed, ${schemas.map(getSchemaLabel).join(' + ')}` : undefined;

export const applyGroupPackages = ({
  items,
  getHref,
  getAbsolutePath,
  addBasePath,
}: {
  items: Array<PackageListItem | CustomIntegration>;
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  getAbsolutePath: (path: string) => string;
  addBasePath: (url: string) => string;
}): {
  groupCards: IntegrationCardItem[];
  remainingItems: Array<PackageListItem | CustomIntegration>;
} => {
  const groups = items.filter(isEprPackage).filter(isGroupPackage);
  if (!groups.length) return { groupCards: [], remainingItems: items };

  const groupNames = new Set(groups.map((g) => g.name));
  const childNames = new Set(
    groups.flatMap((g) => getGroupSchemaChildren(g).map((c) => c.package))
  );
  // Also hide the children's own input/content deps (e.g. nginx_otel_input, nginx_otel), but only
  // when nothing outside the groups' children requires them, so shared ones like filelog_otel stay.
  const getDepNames = (item: PackageListItem) =>
    [...(item.requires?.input ?? []), ...(item.requires?.content ?? [])].map((d) => d.package);
  const eprItems = items.filter(isEprPackage);
  const depsOfChildren = new Set(
    eprItems.filter((item) => childNames.has(item.name)).flatMap(getDepNames)
  );
  const depsOfOthers = new Set(
    eprItems.filter((item) => !childNames.has(item.name)).flatMap(getDepNames)
  );
  depsOfChildren.forEach((name) => {
    if (!depsOfOthers.has(name)) childNames.add(name);
  });

  const remainingItems = items.filter(
    (item) => !isEprPackage(item) || (!groupNames.has(item.name) && !childNames.has(item.name))
  );

  const groupCards = groups.map((group): IntegrationCardItem => {
    const card = mapToCard({ getAbsolutePath, getHref, item: group, addBasePath });
    const installedSchemas = getInstalledGroupSchemas(group, items);
    const installedLabel = getGroupInstalledLabel(installedSchemas);
    const ownChildNames = new Set(getGroupSchemaChildren(group).map((c) => c.package));
    const children = items.filter(isEprPackage).filter((item) => ownChildNames.has(item.name));
    return {
      ...card,
      url: getHref('integration_group', { groupName: group.name }),
      release: undefined,
      installStatus: installedLabel ? installationStatuses.Installed : undefined,
      searchableContent: [
        group.name,
        group.title,
        ...children.flatMap((c) => [c.name, c.title]),
      ].join(' '),
      extraLabelsBadges: [
        ...(card.extraLabelsBadges ?? []),
        ...(installedLabel
          ? [
              <EuiFlexItem grow={false} key="group-installed">
                <EuiSpacer size="xs" />
                <span>
                  <EuiBadge color="success" iconType="check" data-test-subj="groupInstalledBadge">
                    {installedLabel}
                  </EuiBadge>
                </span>
              </EuiFlexItem>,
            ]
          : []),
      ],
    };
  });

  return { groupCards, remainingItems };
};
