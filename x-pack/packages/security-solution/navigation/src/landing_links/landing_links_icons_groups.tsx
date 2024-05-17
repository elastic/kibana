import { EuiFlexGroup } from '@elastic/eui';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { NavigationLink } from '../types';
import { LandingColumnLinks } from './landing_links';
import { LandingLinkIcon } from './landing_links_icons';

export interface LandingLinksIconsGroupsProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

export interface LandingSubLinkProps {
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

export const LandingLinksIconsGroups: React.FC<LandingLinksIconsGroupsProps> = React.memo(
  function LandingLinksIconsGroups({ items, urlState, onLinkClick }) {
    return (
      <EuiFlexGroup gutterSize="xl" wrap>
        {items.map(({ links, ...link }) => (
          <LandingLinkIcon key={link.id} item={link} urlState={urlState} onLinkClick={onLinkClick}>
            {links?.length && (
              <LandingColumnLinks items={links} urlState={urlState} onLinkClick={onLinkClick} />
            )}
          </LandingLinkIcon>
        ))}
      </EuiFlexGroup>
    );
  }
);

// eslint-disable-next-line import/no-default-export
export default LandingLinksIconsGroups;
