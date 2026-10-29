/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toCreateManagedImportData } from './managed_import_form';

describe('toCreateManagedImportData', () => {
  it('sends only the connector when nothing else is filled in', () => {
    expect(
      toCreateManagedImportData({
        connectorId: 'dd-1',
        values: { name: '  ', description: '', tags: [], routingTags: [], owner: '' },
      })
    ).toEqual({ kind: 'managed', connector_id: 'dd-1' });
  });

  it('trims what is filled in and maps the field names', () => {
    expect(
      toCreateManagedImportData({
        connectorId: 'dd-1',
        values: {
          name: ' Datadog (prod) ',
          description: ' monitors ',
          tags: ['prod'],
          routingTags: ['team-a'],
          owner: ' Platform ',
        },
      })
    ).toEqual({
      kind: 'managed',
      connector_id: 'dd-1',
      name: 'Datadog (prod)',
      description: 'monitors',
      tags: ['prod'],
      routing_tags: ['team-a'],
      owner: 'Platform',
    });
  });
});
