/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OSQUERY_MAX_AGENTS_HEADER } from '../../../common/constants';
import { DISPATCH_API_HEADERS } from './api_headers';

describe('DISPATCH_API_HEADERS', () => {
  it('should send the agent ceiling under a name callKibanaApi does not strip', () => {
    // `callKibanaApi` drops every caller-supplied `x-elastic-internal-*` header, so the route
    // would never see the ceiling.
    expect(OSQUERY_MAX_AGENTS_HEADER.toLowerCase().startsWith('x-elastic-internal-')).toBe(false);
    expect(DISPATCH_API_HEADERS).toHaveProperty([OSQUERY_MAX_AGENTS_HEADER]);
  });
});
