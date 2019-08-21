/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getApiPath } from '../get_api_path';

describe('getApiPath', () => {
  it('returns a path with basePath when provided', () => {
    const result = getApiPath('/api/foo/bar', '/somebasepath');
    expect(result).toEqual('/somebasepath/api/foo/bar');
  });

  it('returns a valid path when no basePath present', () => {
    const result = getApiPath('/api/foo/bar');
    expect(result).toEqual('/api/foo/bar');
  });

  it('returns a valid path when an empty string is supplied as basePath', () => {
    const result = getApiPath('/api/foo/bar', '');
    expect(result).toEqual('/api/foo/bar');
  });
});
