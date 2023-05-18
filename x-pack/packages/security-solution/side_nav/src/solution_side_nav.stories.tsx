/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import readme from '../../README.mdx';
import {
  SolutionSideNav as SolutionSideNavComponent,
  type SolutionSideNavProps,
  type SolutionSideNavItem,
} from '..';

const items: SolutionSideNavItem[] = [
  {
    id: 'simpleLink',
    label: 'I am a simple link',
    href: '#',
  },
  {
    id: 'panelLink',
    label: 'I have a simple panel',
    href: '#',
    items: [
      {
        id: 'panelLink1',
        label: 'I am the first nested',
        href: '#',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed dignissim, velit ac dignissim maximus, orci justo mattis neque, non eleifend lectus velit sit amet dolor',
      },
      {
        id: 'panelLink2',
        label: 'I am the second nested',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'linkBeta',
        label: 'I am beta',
        href: '#',
        description: 'This is a beta project',
        isBeta: true,
      },
      {
        id: 'linkTechnicalPreview',
        label: 'I am preview',
        href: '#',
        description: 'This is a technical preview functionality',
        isBeta: true,
        betaOptions: {
          text: 'Technical Preview',
        },
      },
    ],
  },
  {
    id: 'categoriesPanelLink',
    label: 'I have categories',
    href: '#',
    categories: [
      { label: 'First Category', linkIds: ['panelCatLink1', 'panelCatLink2'] },
      { label: 'Second Category', linkIds: ['panelCatLink3', 'panelCatLink4'] },
    ],
    items: [
      {
        id: 'panelCatLink1',
        label: 'I am the first nested',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink2',
        label: 'I am the second nested',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink3',
        label: 'I am the third nested',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink4',
        label: 'I am the fourth nested',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
    ],
  },
  { id: 'linkTruncated', href: '#', label: 'I have truncated text because I am too long' },
  { id: 'linkSmall', href: '#', label: 'I am smaller', labelSize: 'xs' },
];
const footerItems: SolutionSideNavItem[] = [
  { id: 'footerLink', href: '#', label: 'I am a footer link' },
  {
    id: 'footerLinkPanel',
    href: '#',
    label: 'I also have panel',
    items: [
      {
        id: 'footerLinkPanel1',
        label: 'I am a footer nested link',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
    ],
  },
  { id: 'footerLinkSeparator', href: '#', label: 'I have a separator', appendSeparator: true },
  { id: 'footerLinkIcon', href: '#', label: 'I have an icon', iconType: 'heart' },
];

export default {
  title: 'SolutionSideNav',
  description: 'An panel oriented component that renders a nested array of navigation items.',
  parameters: {
    docs: {
      page: readme,
    },
  },
  decorators: [
    (storyFn: Function) => (
      <div
        css={{
          height: '100vh',
          display: 'flex',
        }}
      >
        {storyFn()}
      </div>
    ),
  ],
};

type Params = Pick<SolutionSideNavProps, 'selectedId' | 'panelTopOffset' | 'panelBottomOffset'>;

export const SolutionSideNav = (params: Params) => (
  <>
    <SolutionNav
      name={'Security'}
      icon={'logoSecurity'}
      isOpenOnDesktop={true}
      canBeCollapsed={false}
      // eslint-disable-next-line react/no-children-prop
      children={
        <SolutionSideNavComponent
          items={items}
          footerItems={footerItems}
          selectedId={params.selectedId}
          panelBottomOffset={params.panelBottomOffset || undefined}
          panelTopOffset={params.panelTopOffset || undefined}
        />
      }
    />
    <div
      css={{
        'flex-grow': '1',
        background: 'white',
      }}
    />
  </>
);

SolutionSideNav.argTypes = {
  selectedId: {
    control: { type: 'radio' },
    options: [...items, ...footerItems].map(({ id }) => id),
    defaultValue: 'simpleLink',
  },
  panelTopOffset: {
    control: 'text',
    defaultValue: '0px',
  },
  panelBottomOffset: {
    control: 'text',
    defaultValue: '0px',
  },
};

SolutionSideNav.parameters = {
  layout: 'fullscreen',
};
