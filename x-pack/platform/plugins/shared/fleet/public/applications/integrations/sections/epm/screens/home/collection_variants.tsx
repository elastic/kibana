/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { CardIcon } from '../../../../../../components/package_icon';

import type { CollectionVariant, IntegrationCardItem } from './card_utils';

/**
 * Builds the chooser rows for a collection card. Each variant links to the member's detail
 * page, carrying `returnAppId`/`returnPath` so the detail and add-integration pages navigate
 * back to the host app when the user cancels or saves. What the user lands on is up to the
 * host's `returnPath`:
 * - Fleet's browse pages pass their own path including `?collection=<groupId>`, so the chooser
 *   reopens.
 * - Hosts using the chooser built into `PackageListGrid` (e.g. Security onboarding) pass their own
 *   page path. The chooser is closed when the user comes back.
 *
 * With `onNavigate`, a plain click calls it instead of following the `href` (modified clicks still
 * use the `href`), so the host can navigate with route state.
 */
export const buildCollectionVariants = (
  card: IntegrationCardItem,
  { returnAppId, returnPath }: { returnAppId: string; returnPath: string },
  onNavigate?: (href: string, member: IntegrationCardItem) => void
): CollectionVariant[] =>
  (card.groupMembers ?? []).map((member) => {
    const returnParams = new URLSearchParams({ returnAppId, returnPath });
    const separator = member.url.includes('?') ? '&' : '?';
    const href = `${member.url}${separator}${returnParams.toString()}`;
    return {
      id: member.id,
      title: member.title,
      description: member.description,
      icon: (
        <CardIcon
          icons={member.icons}
          packageName={member.name}
          version={member.version}
          size="l"
        />
      ),
      href,
      ...(onNavigate
        ? {
            onClick: (e: React.MouseEvent) => {
              // Let the browser handle open-in-new-tab style clicks through the href.
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              onNavigate(href, member);
            },
          }
        : {}),
      'data-test-subj': `collectionVariantRow-${member.id}`,
    };
  });
