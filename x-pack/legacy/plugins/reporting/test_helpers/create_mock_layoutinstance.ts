/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createLayout } from '../export_types/common/layouts';
import { LayoutTypes } from '../export_types/common/constants';
import { LayoutInstance } from '../export_types/common/layouts/layout';
import { ServerFacade } from '../types';

export const createMockLayoutInstance = (__LEGACY: ServerFacade) => {
  const mockLayout = createLayout(__LEGACY, {
    id: LayoutTypes.PRESERVE_LAYOUT,
    dimensions: { height: 12, width: 12 },
  }) as LayoutInstance;
  mockLayout.selectors = {
    renderComplete: 'renderedSelector',
    itemsCountAttribute: 'itemsSelector',
    screenshot: 'screenshotSelector',
    timefilterDurationAttribute: 'timefilterDurationSelector',
    toastHeader: 'toastHeaderSelector',
  };
  return mockLayout;
};
