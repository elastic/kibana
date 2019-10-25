/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getStartPlugins } from '../legacy';

let isActive = false;

export interface LoadingIndicatorInterface {
  show: () => void;
  hide: () => void;
}

export const loadingIndicator = {
  show: () => {
    if (!isActive) {
      getStartPlugins().__LEGACY.loadingCount.increment();
      isActive = true;
    }
  },
  hide: () => {
    if (isActive) {
      getStartPlugins().__LEGACY.loadingCount.decrement();
      isActive = false;
    }
  },
};
