/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildBrowserToolsRequest } from './build_browser_tools_request';

describe('buildBrowserToolsRequest', () => {
  it('returns undefined when the surface has no browser tools', () => {
    expect(buildBrowserToolsRequest({ clientId: 'c' })).toBeUndefined();
    expect(
      buildBrowserToolsRequest({ clientId: 'c', browserToolIds: [], browserApiTools: [] })
    ).toBeUndefined();
  });

  it('sends the registered tool ids with the client id', () => {
    expect(buildBrowserToolsRequest({ clientId: 'c', browserToolIds: ['a'] })).toEqual({
      client_id: 'c',
      tool_ids: ['a'],
    });
  });

  it('sends the client id when only legacy tools are present', () => {
    expect(buildBrowserToolsRequest({ clientId: 'c', browserApiTools: [{}] })).toEqual({
      client_id: 'c',
      tool_ids: [],
    });
  });
});
