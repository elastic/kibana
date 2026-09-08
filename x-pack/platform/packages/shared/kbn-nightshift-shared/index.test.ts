/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_CONTEXT_ENGINE_UI_PRIVILEGES,
  NIGHTSHIFT_DETECTION_ENGINE_UI_PRIVILEGES,
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
