/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

const centerSpinnerStyle = { display: 'flex', margin: 'auto' };

type WithSuspense = <T extends object = {}>(Component: React.ComponentType<T>) => React.FC<T>;
const withSuspense: WithSuspense = (Component) =>
  function LazyPageWithSuspense(props) {
    return (
      <Suspense fallback={<EuiLoadingSpinner size="xl" style={centerSpinnerStyle} />}>
        <Component {...props} />
      </Suspense>
    );
  };

const LandingLinksIconsCategoriesLazy = lazy(() => import('./landing_links_icons_categories'));
export const LandingLinksIconsCategories = withSuspense(LandingLinksIconsCategoriesLazy);

const LandingLinksIconsLazy = lazy(() => import('./landing_links_icons'));
export const LandingLinksIcons = withSuspense(LandingLinksIconsLazy);

const LandingLinksIconsGroupsLazy = lazy(() => import('./landing_links_icons_groups'));
export const LandingLinksIconsGroups = withSuspense(LandingLinksIconsGroupsLazy);

const LandingLinksImagesLazy = lazy(() => import('./landing_links_images'));
export const LandingLinksImages = withSuspense(LandingLinksImagesLazy);

const LandingLinksImageCardsLazy = lazy(() => import('./landing_links_images_cards'));
export const LandingLinksImageCards = withSuspense(LandingLinksImageCardsLazy);

const LandingLinksIconsCategoriesGroupsLazy = lazy(
  () => import('./landing_links_icons_categories_groups')
);
export const LandingLinksIconsCategoriesGroups = withSuspense(
  LandingLinksIconsCategoriesGroupsLazy
);
