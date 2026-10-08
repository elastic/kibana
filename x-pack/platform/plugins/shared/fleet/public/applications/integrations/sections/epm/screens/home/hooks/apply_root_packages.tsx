/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// PROTOTYPE: collapse root packages (packages with `schemas`) and their children into one tile.

import React from 'react';
import { EuiBadge, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { installationStatuses } from '../../../../../../../../common/constants';
import {
  getRootSchemaChildren,
  getSchemaLabel,
  isRootPackage,
} from '../../../../../../../../common/services/root_packages';
import type { PackageListItem } from '../../../../../types';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../../../../../constants';
import { mapToCard } from '../card_utils';
import type { IntegrationCardItem } from '../card_utils';

const isEprPackage = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
  item.type !== 'ui_link';

/** Schemas whose child package is installed, e.g. ['ecs', 'otel']. Derived, never stored. */
export const getInstalledRootSchemas = (
  root: PackageListItem,
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
      getRootSchemaChildren(root)
        .filter((child) => installedNames.has(child.package))
        .map((child) => child.schema)
    ),
  ];
};

export const getRootInstalledLabel = (schemas: string[]) =>
  schemas.length ? `Installed, ${schemas.map(getSchemaLabel).join(' + ')}` : undefined;

export const applyRootPackages = ({
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
  rootCards: IntegrationCardItem[];
  remainingItems: Array<PackageListItem | CustomIntegration>;
} => {
  const roots = items.filter(isEprPackage).filter(isRootPackage);
  if (!roots.length) return { rootCards: [], remainingItems: items };

  const rootNames = new Set(roots.map((r) => r.name));
  const childNames = new Set(roots.flatMap((r) => getRootSchemaChildren(r).map((c) => c.package)));

  const remainingItems = items.filter(
    (item) => !isEprPackage(item) || (!rootNames.has(item.name) && !childNames.has(item.name))
  );

  const rootCards = roots.map((root): IntegrationCardItem => {
    const card = mapToCard({ getAbsolutePath, getHref, item: root, addBasePath });
    const installedSchemas = getInstalledRootSchemas(root, items);
    const installedLabel = getRootInstalledLabel(installedSchemas);
    const ownChildNames = new Set(getRootSchemaChildren(root).map((c) => c.package));
    const children = items.filter(isEprPackage).filter((item) => ownChildNames.has(item.name));
    return {
      ...card,
      url: getHref('integration_root', { rootName: root.name }),
      release: undefined,
      installStatus: installedLabel ? installationStatuses.Installed : undefined,
      searchableContent: [
        root.name,
        root.title,
        ...children.flatMap((c) => [c.name, c.title]),
      ].join(' '),
      extraLabelsBadges: [
        ...(card.extraLabelsBadges ?? []),
        ...(installedLabel
          ? [
              <EuiFlexItem grow={false} key="root-installed">
                <EuiSpacer size="xs" />
                <span>
                  <EuiBadge color="success" iconType="check" data-test-subj="rootInstalledBadge">
                    {installedLabel}
                  </EuiBadge>
                </span>
              </EuiFlexItem>,
            ]
          : []),
      ],
    };
  });

  return { rootCards, remainingItems };
};
