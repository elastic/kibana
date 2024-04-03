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
import { LandingColumnLinks } from './landing_links';
import type { NavigationLink } from '../types';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const NAV_ITEM: NavigationLink = {
  id: SecurityPageName.dashboards,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  landingIcon: 'myTestIcon',
};
const NAV_ITEM_2: NavigationLink = {
  id: SecurityPageName.alerts,
  title: 'TEST LABEL 2',
  description: 'TEST DESCRIPTION 2',
  landingIcon: 'myTestIcon',
};

describe('LandingColumnLinks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render items', () => {
    const { queryByText } = render(<LandingColumnLinks items={[NAV_ITEM, NAV_ITEM_2]} />);

    expect(queryByText(NAV_ITEM.title)).toBeInTheDocument();
    expect(queryByText(NAV_ITEM_2.title)).toBeInTheDocument();
  });

  it('should navigate link', () => {
    const { getByText } = render(<LandingColumnLinks items={[NAV_ITEM]} />);

    getByText(NAV_ITEM.title).click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: NAV_ITEM.id,
      absolute: false,
      path: '',
    });
    expect(mockNavigateTo).toHaveBeenCalled();
  });

  it('should add urlState to link', () => {
    const testUrlState = '?some=parameter&and=another';
    const { getByText } = render(<LandingColumnLinks items={[NAV_ITEM]} urlState={testUrlState} />);

    getByText(NAV_ITEM.title).click();

    expect(mockGetAppUrl).toHaveBeenCalledWith({
      deepLinkId: NAV_ITEM.id,
      absolute: false,
      path: testUrlState,
    });
    expect(mockNavigateTo).toHaveBeenCalled();
  });

  it('should call onLinkClick', () => {
    const id = SecurityPageName.administration;
    const title = 'myTestLabel';

    const { getByText } = render(
      <LandingColumnLinks items={[{ ...NAV_ITEM, id, title }]} onLinkClick={mockOnLinkClick} />
    );

    getByText(title).click();

    expect(mockOnLinkClick).toHaveBeenCalledWith(id);
  });
});
