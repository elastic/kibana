/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getLoader,
  reloadLoadersFromStorage,
  setLoader,
  subscribeLoaders,
} from './loader_preference';

describe('loader preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setLoader('agentAvatar', 'pulseDots');
    setLoader('customPanel', 'scanDots');
  });

  it('defaults the avatar to pulse dots and the custom panel to scan', () => {
    window.localStorage.clear();
    reloadLoadersFromStorage();

    expect(getLoader('agentAvatar')).toBe('pulseDots');
    expect(getLoader('customPanel')).toBe('scanDots');
  });

  it('selects scan for a custom panel saved before that option existed', () => {
    window.localStorage.setItem(
      'agentBuilder.loaders',
      JSON.stringify({ agentAvatar: 'elastic', customPanel: 'orbitRing' })
    );
    reloadLoadersFromStorage();

    expect(getLoader('agentAvatar')).toBe('pulseDots');
    expect(getLoader('customPanel')).toBe('scanDots');
  });

  it('selects pulse dots for an avatar saved before that option existed', () => {
    window.localStorage.setItem(
      'agentBuilder.loaders',
      JSON.stringify({ version: 3, agentAvatar: 'orbitRing', customPanel: 'elastic' })
    );
    reloadLoadersFromStorage();

    expect(getLoader('agentAvatar')).toBe('pulseDots');
    expect(getLoader('customPanel')).toBe('elastic');
  });

  it('allows scan dots for workers running', () => {
    setLoader('workersRunning', 'scanDots');
    setLoader('agentAvatar', 'scanDots');

    expect(getLoader('workersRunning')).toBe('scanDots');
    expect(getLoader('agentAvatar')).toBe('pulseDots');
  });

  it('keeps pulse dots on the agent avatar', () => {
    setLoader('agentAvatar', 'pulseDots');
    setLoader('customPanel', 'pulseDots');

    expect(getLoader('agentAvatar')).toBe('pulseDots');
    expect(getLoader('customPanel')).toBe('scanDots');
    reloadLoadersFromStorage();
    expect(getLoader('agentAvatar')).toBe('pulseDots');
  });

  it('stores one scenario without changing the other', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeLoaders(listener);

    setLoader('customPanel', 'elastic');

    expect(getLoader('customPanel')).toBe('elastic');
    expect(getLoader('agentAvatar')).toBe('pulseDots');
    expect(JSON.parse(window.localStorage.getItem('agentBuilder.loaders') ?? '{}')).toEqual({
      version: 4,
      agentAvatar: 'pulseDots',
      customPanel: 'elastic',
      workersRunning: 'pulseDots',
      nightshift: 'scanDots',
    });
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setLoader('agentAvatar', 'elastic');
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
