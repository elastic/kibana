/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationLink } from '../types';
import type { LandingLinksIconsGroupsProps } from './landing_links_icons_groups';
import { LandingLinksIconsGroups as LandingLinksIconsGroupsComponent } from './landing_links_icons_groups';
import { NavigationProvider } from '../context';

const items: NavigationLink[] = [
  {
    id: 'link1',
    title: 'link #1',
    description: 'This is the description of the link #1',
    landingIcon: 'addDataApp',
  },
  {
    id: 'link2',
    title: 'link #2',
    description: 'This is the description of the link #2',
    isBeta: true,
    landingIcon: 'securityAnalyticsApp',
    links: [
      {
        id: 'link3',
        title: 'link #3',
        description: 'This is the description of the link #3',
        landingIcon: 'spacesApp',
      },
      {
        id: 'link4',
        title: 'link #4',
        description: 'This is the description of the link #4',
        landingIcon: 'appSearchApp',
      },
    ],
  },
  {
    id: 'link5',
    title: 'link #5',
    description: 'This is the description of the link #5',
    landingIcon: 'heartbeatApp',
    links: [
      {
        id: 'link6',
        title: 'link #6',
        description: 'This is the description of the link #6',
        landingIcon: 'lensApp',
      },
      {
        id: 'link7',
        title: 'link #7',
        description: 'This is the description of the link #7',
        landingIcon: 'timelionApp',
      },
      {
        id: 'link8',
        title: 'link #8',
        description: 'This is the description of the link #8',
        landingIcon: 'managementApp',
      },
    ],
  },
];

export default {
  title: 'Landing Links/Landing Links Icons Groups',
  description: 'Renders the links with icons with links grouped.',
  decorators: [
    (storyFn: Function) => (
      <div
        css={{
          height: '100%',
          width: '100%',
          background: '#fff',
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
};

const mockCore = {
  application: {
    navigateToApp: () => {},
    getUrlForApp: () => '#',
  },
} as unknown as CoreStart;

export const LandingLinksIconsGroups = (params: LandingLinksIconsGroupsProps) => (
  <div style={{ padding: '25px' }}>
    <NavigationProvider core={mockCore}>
      <LandingLinksIconsGroupsComponent {...params} />
    </NavigationProvider>
  </div>
);

LandingLinksIconsGroups.argTypes = {
  items: {
    control: 'object',
    defaultValue: items,
  },
};

LandingLinksIconsGroups.parameters = {
  layout: 'fullscreen',
};
