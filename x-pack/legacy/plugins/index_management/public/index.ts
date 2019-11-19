/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { npStart } from 'ui/new_platform';

import { IndexMgmtPlugin } from './plugin';
import { __LEGACYStart } from './legacy';
import {
  addSummaryExtension,
  getSummaryExtensions,
  addActionExtension,
  getActionExtensions,
  addBannerExtension,
  getBannerExtensions,
  addFilterExtension,
  getFilterExtensions,
  addToggleExtension,
  getToggleExtensions,
  addBadgeExtension,
  getBadgeExtensions,
} from './index_management_extensions';

export const plugin = () => {
  return new IndexMgmtPlugin();
};

/** @public */
export {
  addSummaryExtension,
  getSummaryExtensions,
  addActionExtension,
  getActionExtensions,
  addBannerExtension,
  getBannerExtensions,
  addFilterExtension,
  getFilterExtensions,
  addToggleExtension,
  getToggleExtensions,
  addBadgeExtension,
  getBadgeExtensions,
};

plugin().start(npStart.core, npStart.plugins, __LEGACYStart);
