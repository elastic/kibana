/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npSetup } from 'ui/new_platform';

import { IndexMgmtUIPlugin, IndexMgmtSetup } from './plugin';

/** @public */
export { IndexMgmtSetup };

export const plugin = () => {
  return new IndexMgmtUIPlugin();
};

// Temp. To be removed after moving to the "plugins" folder

const { indexManagementExtensions } = plugin().setup(npSetup.core, npSetup.plugins);

export const addSummaryExtension = indexManagementExtensions.addSummary.bind(
  indexManagementExtensions
);

export const getSummaryExtensions = () => indexManagementExtensions.summaries;

export const addActionExtension = indexManagementExtensions.addAction.bind(
  indexManagementExtensions
);

export const getActionExtensions = () => indexManagementExtensions.actions;

export const addBannerExtension = indexManagementExtensions.addBanner.bind(
  indexManagementExtensions
);

export const getBannerExtensions = () => indexManagementExtensions.banners;

export const addFilterExtension = indexManagementExtensions.addFilter.bind(
  indexManagementExtensions
);

export const getFilterExtensions = () => indexManagementExtensions.filters;

export const addToggleExtension = indexManagementExtensions.addToggle.bind(
  indexManagementExtensions
);

export const getToggleExtensions = () => indexManagementExtensions.toggles;

export const addBadgeExtension = indexManagementExtensions.addBadge.bind(indexManagementExtensions);

export const getBadgeExtensions = () => indexManagementExtensions.badges;
