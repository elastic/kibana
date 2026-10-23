/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: browse tiles for integration groups (built by Fleet from member packages that bundle
// a `group.yml`, GET /internal/fleet/epm/groups). One tile per group, member packages hidden;
// title, description and icon come from the group. Plain integration packages with one policy
// template open the same wizard as a "group of one": the stock tile, pointed at the wizard.

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { installationStatuses } from '../../../../../../../../common/constants';
import {
  getGroupMemberNames,
  getSchemaLabel,
} from '../../../../../../../../common/services/integration_groups';
import type { IntegrationGroup, PackageListItem } from '../../../../../types';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../../../../../constants';
import { mapToCard } from '../card_utils';
import type { IntegrationCardItem } from '../card_utils';

const isEprPackage = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
  item.type !== 'ui_link';

/** Group members that are in the list, in group member order (default first). */
const getListedMembers = (group: IntegrationGroup, eprItems: PackageListItem[]) =>
  group.members.flatMap((member) => {
    const item = eprItems.find((i) => i.name === member.package);
    return item ? [{ member, item }] : [];
  });

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
    ...new Set(group.members.filter((m) => installedNames.has(m.package)).map((m) => m.schema)),
  ];
};

const getIconType = (path: string) => (path.endsWith('.svg') ? 'image/svg+xml' : 'image/png');

// The tile's name is the group's, so point icons at the package that has them by absolute `path`
// (no `src`). The icon hook resolves `path` as is: /package/<pkg>/<version>/<file> becomes
// <basePath>/api/fleet/epm/packages/<pkg>/<version>/<file>.
const toAbsoluteIcons = (pkg: PackageListItem): IntegrationCardItem['icons'] =>
  (pkg.icons ?? []).map((icon) => ({
    ...icon,
    src: '',
    path: ('path' in icon && icon.path) || `/package/${pkg.name}/${pkg.version}${icon.src}`,
  }));

/** Group icon from `group.yml`, bundled in the default member's archive. */
const getGroupIcons = (group: IntegrationGroup): IntegrationCardItem['icons'] | undefined => {
  if (!group.icon) return undefined;
  const { package: pkgName, version, path } = group.icon;
  const relPath = path.replace(/^\.?\//, '');
  // `path` isn't on PackageSpecIcon, but the icon hook reads it (RegistryImage), as above.
  const icon = {
    src: '',
    path: `/package/${pkgName}/${version}/${relPath}`,
    type: getIconType(relPath),
  };
  return [icon];
};

export const getGroupInstalledLabel = (
  schemas: string[],
  group?: Pick<IntegrationGroup, 'schema_labels'>
) =>
  schemas.length
    ? `Installed, ${schemas.map((s) => getSchemaLabel(s, group)).join(' + ')}`
    : undefined;

/**
 * Can this plain package open the wizard as a group of one? Integration packages with exactly one
 * policy template. Multi-template packages (aws, gcp, azure), input and content packages keep the
 * stock flow. Takes the registry list item: catalog tiles have `policy_templates` stripped.
 */
export const isGroupOfOneCandidate = (pkg: PackageListItem) =>
  (pkg.type ?? 'integration') === 'integration' &&
  (pkg.policy_templates ?? []).length === 1 &&
  !pkg.deprecated;

export const applyGroupPackages = ({
  items,
  groups,
  packages = [],
  getHref,
  getAbsolutePath,
  addBasePath,
  packageVerificationKeyId,
  canAddIntegration,
}: {
  /** Catalog items (packages flattened to tiles, custom integrations). */
  items: Array<PackageListItem | CustomIntegration>;
  groups: IntegrationGroup[];
  /** Registry package list (with `policy_templates`), to find groups of one. */
  packages?: PackageListItem[];
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  getAbsolutePath: (path: string) => string;
  addBasePath: (url: string) => string;
  packageVerificationKeyId?: string;
  canAddIntegration?: boolean;
}): {
  groupCards: IntegrationCardItem[];
  remainingItems: Array<PackageListItem | CustomIntegration>;
} => {
  const eprItems = items.filter(isEprPackage);
  // A member that isn't listed (not compatible with this stack) is skipped; a group with no
  // listed member gets no tile.
  const listedGroups = groups.filter((g) => getListedMembers(g, eprItems).length > 0);
  const memberNames = getGroupMemberNames(listedGroups);

  const groupCards = listedGroups.map((group): IntegrationCardItem => {
    const listed = getListedMembers(group, eprItems);
    const defaultItem = (listed.find((l) => l.member.package === group.default) ?? listed[0]).item;
    const card = mapToCard({ getAbsolutePath, getHref, item: defaultItem, addBasePath });
    const installedLabel = getGroupInstalledLabel(getInstalledGroupSchemas(group, items), group);
    return {
      ...card,
      id: `group:${group.name}`,
      name: group.name,
      title: group.title,
      description: group.description ?? card.description,
      icons: getGroupIcons(group) ?? toAbsoluteIcons(defaultItem),
      url: getHref('integration_group', { groupName: group.name }),
      isIntegrationGroupCard: true,
      release: undefined,
      installStatus: installedLabel ? installationStatuses.Installed : undefined,
      searchableContent: [
        group.name,
        group.title,
        ...listed.flatMap((l) => [l.item.name, l.item.title]),
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

  // Groups of one: ungrouped single-template integration packages keep their stock tile, which
  // opens the wizard instead. A package named like a group stays stock (the group wins).
  const groupNames = new Set(listedGroups.map((g) => g.name));
  const singleNames = new Set(
    packages
      .filter(isGroupOfOneCandidate)
      .map((p) => p.name)
      .filter((name) => !memberNames.has(name) && !groupNames.has(name))
  );
  const isGroupOfOneItem = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
    isEprPackage(item) && singleNames.has(item.name) && !item.integration;

  const groupOfOneCards = items.filter(isGroupOfOneItem).map(
    (item): IntegrationCardItem => ({
      ...mapToCard({
        getAbsolutePath,
        getHref,
        item,
        addBasePath,
        packageVerificationKeyId,
        canAddIntegration,
      }),
      url: getHref('integration_group', { groupName: item.name }),
      isIntegrationGroupCard: true,
    })
  );

  if (!groupCards.length && !groupOfOneCards.length) {
    return { groupCards: [], remainingItems: items };
  }
  const remainingItems = items.filter(
    (item) => !isEprPackage(item) || !(memberNames.has(item.name) || isGroupOfOneItem(item))
  );
  return { groupCards: [...groupCards, ...groupOfOneCards], remainingItems };
};
