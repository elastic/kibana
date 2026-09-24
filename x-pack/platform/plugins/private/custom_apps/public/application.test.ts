/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appIdFromPath, canEditFrom } from './application';

describe('appIdFromPath', () => {
  it('reads the app id out of the route', () => {
    expect(appIdFromPath('/app/abc-123')).toBe('abc-123');
  });

  it('stops at the query string, so the id never absorbs a marker', () => {
    expect(appIdFromPath('/app/abc-123?from=list')).toBe('abc-123');
  });

  it('returns nothing for the listing route', () => {
    expect(appIdFromPath('/')).toBeUndefined();
  });
});

describe('canEditFrom', () => {
  it('allows editing when the reader came through the listing page', () => {
    expect(canEditFrom('?from=list')).toBe(true);
  });

  it('is read-only with no marker, which is how the navigation links', () => {
    // The side-nav deep link is just /app/<id>, so opening an app from the
    // navigation must not offer editing.
    expect(canEditFrom('')).toBe(false);
  });

  it('is read-only for any other origin', () => {
    expect(canEditFrom('?from=elsewhere')).toBe(false);
    expect(canEditFrom('?edit=true')).toBe(false);
  });

  it('still works when the marker is not the first parameter', () => {
    expect(canEditFrom('?tab=Logs&from=list')).toBe(true);
  });
});
