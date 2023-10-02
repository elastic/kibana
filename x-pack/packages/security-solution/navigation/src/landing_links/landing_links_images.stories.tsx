/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationLink } from '../types';
import type { LandingLinksImagesProps } from './landing_links_images';
import { LandingLinksImages as LandingLinksImagesComponent } from './landing_links_images';
import { NavigationProvider } from '../context';

const items: NavigationLink[] = [
  {
    id: 'link1',
    title: 'link #1',
    description: 'This is the description of the link #1',
    landingImage: 'https://dummyimage.com/360x200/efefef/000',
  },
  {
    id: 'link2',
    title: 'link #2',
    description: 'This is the description of the link #2',
    isBeta: true,
    landingImage: 'https://dummyimage.com/360x200/efefef/000',
  },
  {
    id: 'link3',
    title: 'link #3',
    description: 'This is the description of the link #3',
    landingImage: 'https://dummyimage.com/360x200/efefef/000',
  },
  {
    id: 'link4',
    title: 'link #4',
    description: 'This is the description of the link #4',
    landingImage: 'https://dummyimage.com/360x200/efefef/000',
  },
  {
    id: 'link5',
    title: 'link #5',
    description: 'This is the description of the link #5',
    landingImage: 'https://dummyimage.com/360x200/efefef/000',
  },
];

export default {
  title: 'Landing Links/Landing Links Images',
  description: 'Renders the links with images in a vertical layout',
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

export const LandingLinksImages = (params: LandingLinksImagesProps) => (
  <div style={{ padding: '25px' }}>
    <NavigationProvider core={mockCore}>
      <LandingLinksImagesComponent {...params} />
    </NavigationProvider>
  </div>
);

LandingLinksImages.argTypes = {
  items: {
    control: 'object',
    defaultValue: items,
  },
};

LandingLinksImages.parameters = {
  layout: 'fullscreen',
};
