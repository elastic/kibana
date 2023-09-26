/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationLink } from '../types';
import type { LandingLinksIconsCategoriesProps } from './landing_links_icons_categories';
import { LandingLinksIconsCategories as LandingLinksIconsCategoriesComponent } from './landing_links_icons_categories';
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
  },
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
  {
    id: 'link5',
    title: 'link #5',
    description: 'This is the description of the link #5',
    landingIcon: 'heartbeatApp',
  },
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
];

export default {
  title: 'Landing Links/Landing Links Icons Categories',
  description: 'Renders the links with icons grouped by categories.',
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

export const LandingLinksIconsCategories = (params: LandingLinksIconsCategoriesProps) => (
  <div style={{ padding: '25px' }}>
    <NavigationProvider core={mockCore}>
      <LandingLinksIconsCategoriesComponent {...params} />
    </NavigationProvider>
  </div>
);

LandingLinksIconsCategories.argTypes = {
  links: {
    control: 'object',
    defaultValue: items,
  },
  categories: {
    control: 'object',
    defaultValue: [
      {
        type: 'title',
        label: 'First category',
        linkIds: ['link1', 'link2', 'link3'],
      },
      {
        label: 'Second category',
        type: 'title',
        linkIds: ['link4'],
      },
      {
        label: 'Third category',
        type: 'title',
        linkIds: ['link5', 'link6', 'link7', 'link8'],
      },
    ],
  },
};

LandingLinksIconsCategories.parameters = {
  layout: 'fullscreen',
};
