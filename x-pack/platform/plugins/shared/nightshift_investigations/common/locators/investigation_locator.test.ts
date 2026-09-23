/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import {
  InvestigationLocatorDefinition,
  NIGHTSHIFT_INVESTIGATION_LOCATOR_ID,
} from './investigation_locator';

describe('InvestigationLocatorDefinition', () => {
  const definition = new InvestigationLocatorDefinition();

  it('has expected locator id', () => {
    expect(definition.id).toBe(NIGHTSHIFT_INVESTIGATION_LOCATOR_ID);
  });

  it('returns nightshift app location with encoded investigationId parameter', async () => {
    const location = await definition.getLocation({ investigationId: 'inv-123' });
    expect(location).toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '?investigationId=inv-123',
      state: {},
    });
  });

  it('supports q and severity query params', async () => {
    const location = await definition.getLocation({
      q: 'service.name: checkout',
      severity: '80-critical',
    });
    expect(location).toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '?q=service.name%3A+checkout&severity=80-critical',
      state: {},
    });
  });

  it('encodes special characters in investigationId', async () => {
    const location = await definition.getLocation({ investigationId: 'inv/test?id=1&name=a' });
    expect(location).toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '?investigationId=inv%2Ftest%3Fid%3D1%26name%3Da',
      state: {},
    });
  });

  it('returns empty path when investigationId is not provided', async () => {
    const locationWithoutParams = await definition.getLocation();
    expect(locationWithoutParams).toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '',
      state: {},
    });

    const locationWithEmptyParams = await definition.getLocation({});
    expect(locationWithEmptyParams).toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '',
      state: {},
    });
  });
});
