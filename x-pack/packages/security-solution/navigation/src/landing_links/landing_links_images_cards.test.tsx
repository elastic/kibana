/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { SecurityPageName } from '../constants';
import { mockGetAppUrl } from '../../mocks/navigation';
import { LandingLinksImageCards } from './landing_links_images_cards';

jest.mock('../navigation');

mockGetAppUrl.mockImplementation(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`);

const DEFAULT_NAV_ITEM = {
  id: SecurityPageName.overview,
  title: 'TEST LABEL',
  description: 'TEST DESCRIPTION',
  landingImage: 'TEST_IMAGE.png',
};

describe('LandingLinksImageCards', () => {
  it('should render accordion', () => {
    const landingLinksCardsAccordionTestId = 'LandingImageCards-accordion';

    const { queryByTestId } = render(<LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM }]} />);

    expect(queryByTestId(landingLinksCardsAccordionTestId)).toBeInTheDocument();
  });

  it('should render LandingLinksImageCard item', () => {
    const landingLinksCardTestId = 'LandingImageCard-item';

    const { queryByTestId } = render(<LandingLinksImageCards items={[{ ...DEFAULT_NAV_ITEM }]} />);

    expect(queryByTestId(landingLinksCardTestId)).toBeInTheDocument();
  });
});
