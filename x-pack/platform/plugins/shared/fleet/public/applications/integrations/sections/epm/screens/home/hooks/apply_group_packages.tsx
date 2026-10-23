/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: one tile per integration group (registry `GET /groups`), member packages hidden.
// The tile takes title and description from the group and the icon from its `icon` member.

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { installationStatuses } from '../../../../../../../../common/constants';
import {
  getGroupMemberNames,
  getGroupSchemaChildren,
  getSchemaLabel,
} from '../../../../../../../../common/services/integration_groups';
import type { IntegrationGroup, PackageListItem } from '../../../../../types';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../../../../../constants';
import {
  getGroupIconPackage,
  getGroupSchemaOptions,
} from '../../../../../../../hooks/use_group_package';
import { mapToCard } from '../card_utils';
import type { IntegrationCardItem } from '../card_utils';

const isEprPackage = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
  item.type !== 'ui_link';

/** Schemas whose member package is installed, e.g. ['ecs', 'otel']. Derived, never stored. */
export const getInstalledGroupSchemas = (
  group: IntegrationGroup,
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

// The tile's name is the group's, so point the member's icons at the member package by absolute
// `path` (no `src`), which the icon hook resolves without using the tile's package name.
const toAbsoluteIcons = (pkg: PackageListItem): IntegrationCardItem['icons'] =>
  (pkg.icons ?? []).map((icon) => ({
    ...icon,
    src: '',
    path: ('path' in icon && icon.path) || `/package/${pkg.name}/${pkg.version}${icon.src}`,
  }));

export const getGroupInstalledLabel = (schemas: string[]) =>
  schemas.length ? `Installed, ${schemas.map(getSchemaLabel).join(' + ')}` : undefined;

export const applyGroupPackages = ({
  items,
  groups,
  getHref,
  getAbsolutePath,
  addBasePath,
}: {
  items: Array<PackageListItem | CustomIntegration>;
  groups: IntegrationGroup[];
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  getAbsolutePath: (path: string) => string;
  addBasePath: (url: string) => string;
}): {
  groupCards: IntegrationCardItem[];
  remainingItems: Array<PackageListItem | CustomIntegration>;
} => {
  const eprItems = items.filter(isEprPackage);
  // A schema whose package isn't listed (not compatible with this stack) is skipped; a group with
  // no listed member gets no tile.
  const listedGroups = groups.filter((g) => getGroupSchemaOptions(g, eprItems).length > 0);
  if (!listedGroups.length) return { groupCards: [], remainingItems: items };

  const memberNames = getGroupMemberNames(listedGroups);
  const remainingItems = items.filter((item) => !isEprPackage(item) || !memberNames.has(item.name));

  const groupCards = listedGroups.map((group): IntegrationCardItem => {
    const options = getGroupSchemaOptions(group, eprItems);
    const iconPackage = getGroupIconPackage(group, eprItems) ?? options[0].child;
    const card = mapToCard({ getAbsolutePath, getHref, item: iconPackage, addBasePath });
    const installedLabel = getGroupInstalledLabel(getInstalledGroupSchemas(group, items));
    return {
      ...card,
      id: `group:${group.name}`,
      name: group.name,
      title: group.title,
      description: group.description ?? card.description,
      icons: toAbsoluteIcons(iconPackage),
      url: getHref('integration_group', { groupName: group.name }),
      isIntegrationGroupCard: true,
      release: undefined,
      installStatus: installedLabel ? installationStatuses.Installed : undefined,
      searchableContent: [
        group.name,
        group.title,
        ...options.flatMap((o) => [o.child.name, o.child.title]),
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
