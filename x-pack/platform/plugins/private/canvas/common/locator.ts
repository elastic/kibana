/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/common';

import { CANVAS_APP } from './lib/constants';

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CanvasAppLocatorParams = {
  view: 'workpadPDF';
  id: string;
  page: number;
};

export type CanvasAppLocator = LocatorPublic<CanvasAppLocatorParams>;

export const CANVAS_APP_LOCATOR = 'CANVAS_APP_LOCATOR';

export class CanvasAppLocatorDefinition implements LocatorDefinition<CanvasAppLocatorParams> {
  id = CANVAS_APP_LOCATOR;

  public async getLocation(params: CanvasAppLocatorParams) {
    const app = CANVAS_APP;

    if (params.view === 'workpadPDF') {
      const { id, page } = params;

      return {
        app,
        path: `#/export/workpad/pdf/${id}/page/${page}`,
        state: {},
      };
    }

    return {
      app,
      path: '#/',
      state: {},
    };
  }
}
