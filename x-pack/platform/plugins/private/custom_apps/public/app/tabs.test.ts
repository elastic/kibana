/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomAppDefinition } from '../../common/app_definition';
import { getTabs } from './custom_app_grid';

const definition = (panels: CustomAppDefinition['panels']): CustomAppDefinition =>
  ({ version: 1, title: 't', layout: {}, panels, surfaces: {} } as CustomAppDefinition);

describe('getTabs', () => {
  it('lists distinct tabs in declaration order', () => {
    expect(
      getTabs(
        definition({
          a: { tab: 'Overview' },
          b: { tab: 'Errors' },
          c: { tab: 'Overview' },
        })
      )
    ).toEqual(['Overview', 'Errors']);
  });

  it('ignores panels with no tab, which is what makes them persistent', () => {
    expect(getTabs(definition({ header: {}, a: { tab: 'Overview' } }))).toEqual(['Overview']);
  });

  it('returns nothing for an app that does not use tabs', () => {
    expect(getTabs(definition({ a: {}, b: {} }))).toEqual([]);
  });
});
