/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPackageCardNavigateState } from './package_card_navigate_state';

describe('buildPackageCardNavigateState', () => {
  it('stashes only returnAppId and returnPath when both are present', () => {
    expect(
      buildPackageCardNavigateState({
        search: '?q=nginx&returnAppId=observabilityOnboarding&returnPath=%3F',
        fromIntegrations: 'installed',
      })
    ).toEqual({
      fromIntegrations: 'installed',
      catalogReturn: {
        returnAppId: 'observabilityOnboarding',
        returnPath: '?',
      },
    });
  });

  it('omits catalogReturn when search is empty', () => {
    expect(
      buildPackageCardNavigateState({
        search: '',
        fromIntegrations: 'installed',
      })
    ).toEqual({
      fromIntegrations: 'installed',
    });
  });

  it('includes fromCollection when provided', () => {
    const fromCollection = { groupId: 'nginx', title: 'Nginx' };
    expect(
      buildPackageCardNavigateState({
        search: '?returnAppId=observabilityOnboarding&returnPath=%3F',
        fromIntegrations: undefined,
        fromCollection,
      })
    ).toEqual({
      fromIntegrations: undefined,
      fromCollection,
      catalogReturn: {
        returnAppId: 'observabilityOnboarding',
        returnPath: '?',
      },
    });
  });
});
