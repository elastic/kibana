/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLAIM_STRATEGY_UPDATE_BY_QUERY, CLAIM_STRATEGY_MGET, DEFAULT_CAPACITY } from '../config';
import { getDefaultCapacity } from './get_default_capacity';

describe('getDefaultCapacity', () => {
  it('returns default capacity when autoCalculateDefaultEchCapacity=false', () => {
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: false,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: false,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: false,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: false,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);
  });

  it('returns default capacity when not in cloud', () => {
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);
  });

  it('returns default capacity when default claim strategy', () => {
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_UPDATE_BY_QUERY,
      })
    ).toBe(DEFAULT_CAPACITY);
  });

  it('returns default capacity when serverless', () => {
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: false,
        isServerless: true,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: true,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);

    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: true,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(DEFAULT_CAPACITY);
  });

  it('returns capacity as expected when in cloud and claim strategy is mget', () => {
    // 1GB
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(10);

    // 1GB but somehow background task node only is true
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 851443712,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(10);

    // 2GB
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 1702887424,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(15);

    // 2GB but somehow background task node only is true
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 1702887424,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(15);

    // 4GB
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 3405774848,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: false,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(25);

    // 4GB background task only
    expect(
      getDefaultCapacity({
        autoCalculateDefaultEchCapacity: true,
        heapSizeLimit: 3405774848,
        isCloud: true,
        isServerless: false,
        isBackgroundTaskNodeOnly: true,
        claimStrategy: CLAIM_STRATEGY_MGET,
      })
    ).toBe(50);
  });
});
