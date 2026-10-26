/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatConnectorSpecAction } from './format_connector_spec_action';

describe('formatConnectorSpecAction', () => {
  it('maps the fields in the current API response', () => {
    expect(
      formatConnectorSpecAction({
        name: 'listIncidents',
        description: 'List incidents',
        isTool: true,
        scope: 'read',
      })
    ).toEqual({
      name: 'listIncidents',
      description: 'List incidents',
      is_tool: true,
      scope: 'read',
    });
  });

  it('omits optional fields when undefined', () => {
    expect(formatConnectorSpecAction({ name: 'ping', isTool: false })).toEqual({
      name: 'ping',
      is_tool: false,
    });
  });
});
