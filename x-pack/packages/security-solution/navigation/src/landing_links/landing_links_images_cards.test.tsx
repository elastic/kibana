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
import { LandingLinksImageCards } from './landing_links_images_cards';
import { BETA } from './beta_badge';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);
const mockOnLinkClick = jest.fn();

const DEFAULT_NAV_ITEM = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  landingImage: 'TEST_IMAGE.png',
};

describe('LandingLinksImageCards', () => {
  it('should render', () => {
    const title = 'test label';

    const { queryByText } = render(
      <LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM, title }]} />
    );

    expect(queryByText(title)).toBeInTheDocument();
  });

  it('should render landingImage', () => {
    const landingImage = 'test_image.jpeg';
    const title = 'TEST_LABEL';

    const { getByTestId } = render(
      <LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM, landingImage, title }]} />
    );

    expect(getByTestId('LandingImageCard-image')).toHaveAttribute('src', landingImage);
  });

  it('should render beta tag when isBeta is true', () => {
    const { queryByText } = render(
      <LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM, isBeta: true }]} />
    );
    expect(queryByText(BETA)).toBeInTheDocument();
  });

  it('should not render beta tag when isBeta is false', () => {
    const { queryByText } = render(<LandingLinksImageCards items={[DEFAULT_NAV_ITEM]} />);
    expect(queryByText(BETA)).not.toBeInTheDocument();
  });

  it('should navigate link', () => {
    const id = SecurityPageName.administration;
    const title = 'test label 2';

    const { getByText } = render(
      <LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM, id, title }]} />
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
      <LandingLinksImageCards
        items={[{ ...DEFAULT_NAV_ITEM, id, title }]}
        onLinkClick={mockOnLinkClick}
      />
    );

    getByText(title).click();

    expect(mockOnLinkClick).toHaveBeenCalledWith(id);
  });
});
