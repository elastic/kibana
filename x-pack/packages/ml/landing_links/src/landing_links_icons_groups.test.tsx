/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecurityPageName } from '../constants';
import { mockNavigateTo, mockGetAppUrl } from '../../mocks/navigation';
import type { NavigationLink } from '../types';
import { LandingLinksIconsGroups } from './landing_links_icons_groups';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const items: NavigationLink[] = [
  {
    id: SecurityPageName.dashboards,
    title: 'dashboards title',
    description: 'dashboards description',
    landingIcon: 'testIcon1',
  },
  {
    id: SecurityPageName.rules,
    title: 'rules title',
    description: 'rules description',
    landingIcon: 'testIcon1',
    links: [
      {
        id: SecurityPageName.exceptions,
        title: 'exceptions title',
        description: 'exceptions description',
        landingIcon: 'testIcon2',
      },
    ],
  },
  {
    id: SecurityPageName.network,
    title: 'network title',
    description: 'network description',
    landingIcon: 'testIcon3',
    links: [
      {
        id: SecurityPageName.hosts,
        title: 'hosts title',
        description: 'hosts description',
      },
      {
        id: SecurityPageName.users,
        title: 'users title',
        description: 'users description',
      },
    ],
  },
];

describe('LandingLinksIconsGroups', () => {
  it('should render main items with description', () => {
    const { queryByText } = render(<LandingLinksIconsGroups items={items} />);

    expect(queryByText('rules title')).toBeInTheDocument();
    expect(queryByText('rules description')).toBeInTheDocument();
    expect(queryByText('network title')).toBeInTheDocument();
    expect(queryByText('network description')).toBeInTheDocument();
    expect(queryByText('dashboards title')).toBeInTheDocument();
    expect(queryByText('dashboards description')).toBeInTheDocument();
  });

  it('should render grouped single links', () => {
    const { queryByText } = render(<LandingLinksIconsGroups items={items} />);

    expect(queryByText('exceptions title')).toBeInTheDocument();
    expect(queryByText('exceptions description')).not.toBeInTheDocument();
    expect(queryByText('hosts title')).toBeInTheDocument();
    expect(queryByText('hosts description')).not.toBeInTheDocument();
    expect(queryByText('users title')).toBeInTheDocument();
    expect(queryByText('users description')).not.toBeInTheDocument();
  });

  it('should render items in the same order as defined', () => {
    const { queryAllByTestId } = render(<LandingLinksIconsGroups items={items} />);

    const renderedItems = queryAllByTestId('LandingItem');
    expect(renderedItems[0]).toHaveTextContent('dashboards title');
    expect(renderedItems[1]).toHaveTextContent('rules title');
    expect(renderedItems[2]).toHaveTextContent('network title');

    const renderedSubItems = queryAllByTestId('LandingSubItem');
    expect(renderedSubItems[0]).toHaveTextContent('exceptions title');
    expect(renderedSubItems[1]).toHaveTextContent('hosts title');
    expect(renderedSubItems[2]).toHaveTextContent('users title');
  });

  it('should navigate link', () => {
    const { getByText } = render(<LandingLinksIconsGroups items={items} />);

    getByText('rules title').click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.rules,
      absolute: false,
      path: '',
    });
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/rules' });
  });

  it('should call onLinkClick', () => {
    const { getByText } = render(
      <LandingLinksIconsGroups items={items} onLinkClick={mockOnLinkClick} />
    );
    getByText('rules title').click();
    expect(mockOnLinkClick).toHaveBeenCalledWith(SecurityPageName.rules);
  });
});
