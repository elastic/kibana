/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformRequest } from './transform_request';

describe('transformRequest', () => {
  let location: Location;

  beforeEach(() => {
    location = global.window.location;
    // @ts-expect-error we need to set our own location value
    delete global.window.location;
    global.window.location = {
      origin: 'https://transform.test.local',
    } as unknown as Location;
  });

  afterEach(() => {
    Object.defineProperty(global.window, 'location', { value: location });
  });

  it.each([
    ['/internal/maps/fake/path', 'https://transform.test.local/internal/maps/fake/path'],
    ['/', 'https://transform.test.local/'],
    [' /with/space', 'https://transform.test.local/with/space'],
  ])('converts %s to absolute URL', (input, output) => {
    const { url } = transformRequest(input, 'Foo');
    expect(url).toBe(output);
  });
});
