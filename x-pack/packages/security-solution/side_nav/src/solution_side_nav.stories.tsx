/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SolutionNav } from '@kbn/shared-ux-page-solution-nav';
import { LinkCategoryType } from '@kbn/security-solution-navigation';
import readme from '../../README.mdx';
import {
  SolutionSideNav as SolutionSideNavComponent,
  type SolutionSideNavProps,
  type SolutionSideNavItem,
  SolutionSideNavItemPosition,
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
        label: 'I am an external link that opens in a new tab',
        href: '#',
        openInNewTab: true,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelLink3',
        label: 'I have an icon',
        iconType: 'logoVulnerabilityManagement',
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
      {
        id: 'panelLinkAll',
        label: 'I have all things',
        href: '#',
        iconType: 'logoSiteSearch',
        openInNewTab: true,
        isBeta: true,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
    ],
  },
  {
    id: 'categoriesPanelLink',
    label: 'I have categories',
    href: '#',
    categories: [
      { type: LinkCategoryType.separator, linkIds: ['panelCatLink1'] },
      {
        type: LinkCategoryType.title,
        label: 'Title Category',
        linkIds: ['panelCatLink2', 'panelCatLink3'],
      },
      {
        type: LinkCategoryType.accordion,
        label: 'ACCORDION CATEGORY',
        categories: [
          { label: 'Nested Category', linkIds: ['panelCatLink4', 'panelCatLink5'] },
          { label: 'Second Nested', linkIds: ['panelCatLink6'] },
        ],
      },
    ],
    items: [
      {
        id: 'panelCatLink1',
        label: 'I am in a separator category',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink2',
        label: 'I am in a title category',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink3',
        label: 'Me too',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink4',
        label: 'I am in an accordion category',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink5',
        label: 'Me too',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
      {
        id: 'panelCatLink6',
        label: 'I am another nested sub-category',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
    ],
  },
  { id: 'linkWrapped', href: '#', label: 'I have wrapped text because I am too long' },
  {
    id: 'bottomLink',
    href: '#',
    label: 'I am a bottom link',
    position: SolutionSideNavItemPosition.bottom,
  },
  {
    id: 'bottomLinkPanel',
    href: '#',
    label: 'I also have panel',
    position: SolutionSideNavItemPosition.bottom,
    items: [
      {
        id: 'bottomLinkPanel1',
        label: 'I am a bottom nested link',
        href: '#',
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
      },
    ],
  },
  {
    id: 'bottomLinkSeparator',
    href: '#',
    label: 'I have a separator',
    appendSeparator: true,
    position: SolutionSideNavItemPosition.bottom,
  },
  {
    id: 'bottomLinkIcon',
    href: '#',
    label: 'I have an icon',
    iconType: 'heart',
    position: SolutionSideNavItemPosition.bottom,
  },
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

export const SolutionSideNav = (params: SolutionSideNavProps) => (
  <>
    <SolutionNav
      name={'Security'}
      icon={'logoSecurity'}
      isOpenOnDesktop={true}
      canBeCollapsed={false}
      // eslint-disable-next-line react/no-children-prop
      children={
        <SolutionSideNavComponent
          items={params.items}
          selectedId={params.selectedId}
          categories={params.categories}
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
    options: items.map(({ id }) => id),
    defaultValue: 'simpleLink',
  },
  items: {
    control: 'object',
    defaultValue: items,
  },
  categories: {
    control: 'object',
    defaultValue: [
      {
        type: 'separator',
        linkIds: ['simpleLink', 'panelLink', 'categoriesPanelLink'],
      },
      {
        type: 'separator',
        linkIds: ['linkWrapped'],
      },
      {
        type: 'separator',
        linkIds: ['bottomLink', 'bottomLinkPanel', 'bottomLinkSeparator', 'bottomLinkIcon'],
      },
    ],
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
