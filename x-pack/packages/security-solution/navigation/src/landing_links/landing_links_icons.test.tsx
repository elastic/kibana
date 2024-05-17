/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { mockGetAppUrl, mockNavigateTo } from '../../mocks/navigation';
import { SecurityPageName } from '../constants';
import { BETA } from './beta_badge';
import { LandingLinksIcons } from './landing_links_icons';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const DEFAULT_NAV_ITEM = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  landingIcon: 'myTestIcon',
};

describe('LandingLinksIcons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render items', () => {
    const id = SecurityPageName.administration;
    const title = 'test label 2';
    const description = 'description 2';

    const { queryByText } = render(
      <LandingLinksIcons
        items={[DEFAULT_NAV_ITEM, { ...DEFAULT_NAV_ITEM, id, title, description }]}
      />
    );

    expect(queryByText(DEFAULT_NAV_ITEM.title)).toBeInTheDocument();
    expect(queryByText(DEFAULT_NAV_ITEM.description)).toBeInTheDocument();
    expect(queryByText(title)).toBeInTheDocument();
    expect(queryByText(description)).toBeInTheDocument();
  });

  it('should render beta', () => {
    const { queryByText } = render(
      <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, isBeta: true }]} />
    );
    expect(queryByText(DEFAULT_NAV_ITEM.title)).toBeInTheDocument();
    expect(queryByText(BETA)).toBeInTheDocument();
  });

  it('should navigate link', () => {
    const id = SecurityPageName.administration;
    const title = 'test label 2';

    const { getByText } = render(
      <LandingLinksIcons items={[{ ...DEFAULT_NAV_ITEM, id, title }]} />
    );

    getByText(title).click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: SecurityPageName.administration,
      absolute: false,
      path: '',
    });
    expect(mockNavigateTo).toHaveBeenCalledWith({ url: '/administration' });
  });

  it('should call onLinkClick', () => {
    const id = SecurityPageName.administration;
    const title = 'myTestLabel';

    const { getByText } = render(
      <LandingLinksIcons
        items={[{ ...DEFAULT_NAV_ITEM, id, title }]}
        onLinkClick={mockOnLinkClick}
      />
    );

    getByText(title).click();

    expect(mockOnLinkClick).toHaveBeenCalledWith(id);
  });
});
