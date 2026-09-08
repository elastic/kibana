/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES,
  canPauseNightshiftActivity,
  canShowNightshiftLanding,
  canShowNightshiftManagement,
  getNightshiftCapabilities,
} from '.';

describe('getNightshiftCapabilities', () => {
  it('returns all false when nightshift is missing', () => {
    expect(getNightshiftCapabilities(undefined)).toEqual({
      canShowContext: false,
      canShowDetection: false,
      canManageContext: false,
      canManageDetection: false,
    });
  });

  it('reads only === true flags', () => {
    expect(
      getNightshiftCapabilities({
        [NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show]: true,
        [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.manage]: 'true',
      })
    ).toEqual({
      canShowContext: true,
      canShowDetection: false,
      canManageContext: false,
      canManageDetection: false,
    });
  });
});

describe('Nightshift capability combinators', () => {
  const contextOnly = getNightshiftCapabilities({
    [NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.show]: true,
  });
  const detectionOnly = getNightshiftCapabilities({
    [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.show]: true,
  });
  const contextManage = getNightshiftCapabilities({
    [NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES.manage]: true,
  });
  const detectionManage = getNightshiftCapabilities({
    [NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES.manage]: true,
  });

  it('opens landing for Detection show only', () => {
    expect(canShowNightshiftLanding(contextOnly)).toBe(false);
    expect(canShowNightshiftLanding(detectionOnly)).toBe(true);
  });

  it('opens management for Context or Detection show', () => {
    expect(canShowNightshiftManagement(contextOnly)).toBe(true);
    expect(canShowNightshiftManagement(detectionOnly)).toBe(true);
  });

  it('pauses activity for Context or Detection manage', () => {
    expect(canPauseNightshiftActivity(contextManage)).toBe(true);
    expect(canPauseNightshiftActivity(detectionManage)).toBe(true);
  });
});
