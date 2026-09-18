/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deepFreeze } from '@kbn/std';
import { ruleSavedObjectAttributesSchema } from './v4';

const alertAttributes = {
  kind: 'alert',
  metadata: { name: 'cpu', version: 1 },
  query: { base: 'FROM logs-*', breach: { segment: 'WHERE count > 10' } },
  recovery: { strategy: 'no_breach' },
  no_data: { strategy: 'ignore' },
  schedule: { every: '1m' },
  time_field: '@timestamp',
  enabled: true,
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('rule saved object attributes v4', () => {
  // The saved object type registry deep-freezes every registered type, so a schema
  // that mutates itself on first validate throws at write time rather than at
  // registration. Freeze here to catch that before it reaches a running Kibana.
  it('validates an alert rule after the registry has frozen the schema', () => {
    deepFreeze({ schemas: { create: ruleSavedObjectAttributesSchema } });

    expect(() => ruleSavedObjectAttributesSchema.validate(alertAttributes)).not.toThrow();
  });

  it('validates a signal rule without the lifecycle objects', () => {
    const { recovery, no_data: noData, ...signalAttributes } = alertAttributes;

    expect(() =>
      ruleSavedObjectAttributesSchema.validate({ ...signalAttributes, kind: 'signal' })
    ).not.toThrow();
  });
});
