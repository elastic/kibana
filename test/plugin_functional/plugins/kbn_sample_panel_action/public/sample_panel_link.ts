/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Action, createAction } from '@kbn/ui-actions-plugin/public';

export const SAMPLE_PANEL_LINK = 'samplePanelLink';

export const createSamplePanelLink = (): Action =>
  createAction({
    id: SAMPLE_PANEL_LINK,
    type: SAMPLE_PANEL_LINK,
    getDisplayName: () => 'Sample panel Link',
    execute: async () => {
      window.location.href = 'https://example.com/kibana/test';
    },
    getHref: async () => 'https://example.com/kibana/test',
  });
