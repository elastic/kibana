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
import type { LinkCategories, NavigationLink } from '../types';
import { LandingLinksIconsCategories } from './landing_links_icons_categories';
import { BETA } from './beta_badge';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const RULES_ITEM_LABEL = 'elastic rules!';
const EXCEPTIONS_ITEM_LABEL = 'exceptional!';
const HOSTS_ITEM_LABEL = 'hosts!!';
const CATEGORY_1_LABEL = 'first tests category';
const CATEGORY_2_LABEL = 'second tests category';

const categories: LinkCategories = [
  {
    label: CATEGORY_1_LABEL,
    linkIds: [SecurityPageName.rules],
  },
  {
    label: CATEGORY_2_LABEL,
    linkIds: [SecurityPageName.exceptions, SecurityPageName.hosts],
  },
];

const links: NavigationLink[] = [
  {
    id: SecurityPageName.rules,
    title: RULES_ITEM_LABEL,
    description: 'rules',
    landingIcon: 'testIcon1',
  },
  {
    id: SecurityPageName.exceptions,
    title: EXCEPTIONS_ITEM_LABEL,
    description: 'exceptions',
    landingIcon: 'testIcon2',
  },
  {
    id: SecurityPageName.hosts,
    title: HOSTS_ITEM_LABEL,
    description: 'hosts',
    landingIcon: 'testIcon3',
  },
];

describe('LandingLinksIconsCategories', () => {
  it('should render items', () => {
    const { queryByText } = render(<LandingLinksIconsCategories {...{ links, categories }} />);

    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(HOSTS_ITEM_LABEL)).toBeInTheDocument();
  });

  it('should render beta', () => {
    const link = { ...links[0], isBeta: true };
    const { queryByText } = render(
      <LandingLinksIconsCategories {...{ links: [link], categories }} />
    );
    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(BETA)).toBeInTheDocument();
  });

  it('should render categories', () => {
    const { queryByText } = render(<LandingLinksIconsCategories {...{ links, categories }} />);

    expect(queryByText(CATEGORY_1_LABEL)).toBeInTheDocument();
    expect(queryByText(CATEGORY_2_LABEL)).toBeInTheDocument();
  });

  it('should render items in the same order as defined', () => {
    const testCategories = [
      { ...categories[0], linkIds: [SecurityPageName.hosts, SecurityPageName.exceptions] },
    ];
    const { queryAllByTestId } = render(
      <LandingLinksIconsCategories {...{ links, categories: testCategories }} />
    );

    const renderedItems = queryAllByTestId('LandingItem');

    expect(renderedItems[0]).toHaveTextContent(HOSTS_ITEM_LABEL);
    expect(renderedItems[1]).toHaveTextContent(EXCEPTIONS_ITEM_LABEL);
  });

  it('should not render category items that are not present in links', () => {
    const testLinks = [links[0], links[1]]; // no hosts
    const { queryByText } = render(
      <LandingLinksIconsCategories {...{ links: testLinks, categories }} />
    );

    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(RULES_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(HOSTS_ITEM_LABEL)).not.toBeInTheDocument();
  });

  it('should not render category if all items filtered', () => {
    const testLinks = [links[1], links[2]]; // no rules
    const { queryByText } = render(
      <LandingLinksIconsCategories {...{ links: testLinks, categories }} />
    );

    expect(queryByText(CATEGORY_2_LABEL)).toBeInTheDocument();
    expect(queryByText(EXCEPTIONS_ITEM_LABEL)).toBeInTheDocument();
    expect(queryByText(HOSTS_ITEM_LABEL)).toBeInTheDocument();

    expect(queryByText(CATEGORY_1_LABEL)).not.toBeInTheDocument();
    expect(queryByText(RULES_ITEM_LABEL)).not.toBeInTheDocument();
  });

  it('should navigate link', () => {
    const { getByText } = render(<LandingLinksIconsCategories {...{ links, categories }} />);

    getByText(RULES_ITEM_LABEL).click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.rules,
      absolute: false,
      path: '',
    });
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/rules' });
  });

  it('should call onLinkClick', () => {
    const { getByText } = render(
      <LandingLinksIconsCategories {...{ links, categories, onLinkClick: mockOnLinkClick }} />
    );
    getByText(RULES_ITEM_LABEL).click();
    expect(mockOnLinkClick).toHaveBeenCalledWith(SecurityPageName.rules);
  });
});
