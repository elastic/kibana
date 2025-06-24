/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { map } from 'rxjs';

import type { AnalyticsClient } from '@kbn/core-analytics-browser';

import type { SolutionView, Space } from '../../common';

export interface SpaceMetadata {
  spaceSolutionView?: SolutionView;
}

export function registerAnalyticsContext(
  analytics: Pick<AnalyticsClient, 'registerContextProvider'>,
  activeSpace: Observable<Space>
) {
  analytics.registerContextProvider({
    name: 'Spaces Metadata',
    context$: activeSpace.pipe(map((space) => ({ spaceSolution: space.solution }))),
    schema: {
      spaceSolution: {
        type: 'keyword',
        _meta: { description: 'The Space solution view', optional: true },
      },
    },
  });
}
