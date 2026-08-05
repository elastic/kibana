/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

import { installationStatuses } from '../../../../../../../../common/constants';
import type { PackageListItem } from '../../../../../types';
import type { StaticPage, DynamicPage, DynamicPagePathValues } from '../../../../../constants';
import { mapToCard } from '../card_utils';
import type { IntegrationCardItem } from '../card_utils';
import { INTEGRATION_GROUPS } from '../integration_groups';

interface ApplyGroupingParams {
  items: Array<PackageListItem | CustomIntegration>;
  getHref: (page: StaticPage | DynamicPage, values?: DynamicPagePathValues) => string;
  getAbsolutePath: (path: string) => string;
  addBasePath: (url: string) => string;
  packageVerificationKeyId?: string;
}

interface ApplyGroupingResult {
  collectionCards: IntegrationCardItem[];
  ungroupedItems: Array<PackageListItem | CustomIntegration>;
}

const isEprPackage = (item: PackageListItem | CustomIntegration): item is PackageListItem =>
  item.type !== 'ui_link';

export const applyGrouping = ({
  items,
  getHref,
  getAbsolutePath,
  addBasePath,
  packageVerificationKeyId,
}: ApplyGroupingParams): ApplyGroupingResult => {
  const byGroup = new Map<string, PackageListItem[]>();
  const ungroupedItems: Array<PackageListItem | CustomIntegration> = [];

  for (const item of items) {
    if (!isEprPackage(item)) {
      ungroupedItems.push(item);
      continue;
    }
    const groupId = item.group;
    if (groupId && INTEGRATION_GROUPS[groupId]) {
      const existing = byGroup.get(groupId) ?? [];
      existing.push(item);
      byGroup.set(groupId, existing);
    } else {
      ungroupedItems.push(item);
    }
  }

  const collectionCards: IntegrationCardItem[] = [];

  for (const [groupId, groupItems] of byGroup.entries()) {
    // Deduplicate by package name so that multi-policy-template packages count as one member.
    const seenNames = new Set<string>();
    const representativeItems: PackageListItem[] = [];
    for (const item of groupItems) {
      if (!seenNames.has(item.name)) {
        representativeItems.push(item);
        seenNames.add(item.name);
      }
    }

    if (representativeItems.length < 2) {
      // Singleton group — render as normal tiles.
      ungroupedItems.push(...groupItems);
      continue;
    }

    const groupConfig = INTEGRATION_GROUPS[groupId];

    const memberCards = representativeItems.map((item) =>
      mapToCard({ getAbsolutePath, getHref, item, addBasePath, packageVerificationKeyId })
    );

    const anyInstalled = representativeItems.some(
      (m) => m.installationInfo?.install_status === installationStatuses.Installed
    );

    const searchableContent = representativeItems
      .flatMap((m) => [m.name, m.title, m.description ?? ''])
      .join(' ');

    const categories = [
      ...new Set(representativeItems.flatMap((m) => (m.categories ?? []) as string[])),
    ];

    const collectionCard: IntegrationCardItem = {
      id: `collection:${groupId}`,
      name: groupId,
      title: groupConfig.title,
      description: groupConfig.description,
      icons: groupConfig.icons,
      url: getHref('integration_collection', { groupId }),
      integration: '',
      version: '',
      categories,
      isCollectionCard: true,
      groupMembers: memberCards,
      installStatus: anyInstalled ? installationStatuses.Installed : undefined,
      release: undefined,
      fromIntegrations: undefined,
      isDeprecated: false,
      isUnverified: false,
      isUpdateAvailable: false,
      isReauthorizationRequired: false,
      searchableContent,
    };

    collectionCards.push(collectionCard);
  }

  return { collectionCards, ungroupedItems };
};
