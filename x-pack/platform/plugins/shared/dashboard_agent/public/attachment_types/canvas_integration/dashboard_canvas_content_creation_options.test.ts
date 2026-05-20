/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardCanvasCreationOptions } from './dashboard_canvas_content';

describe('getDashboardCanvasCreationOptions', () => {
  it('sets lazyFlyoutType to overlay for Agent Builder canvas preview', async () => {
    const options = await getDashboardCanvasCreationOptions({
      dashboardState: { title: 'Test', panels: [] },
    });

    expect(options.lazyFlyoutType).toBe('overlay');
  });
});
