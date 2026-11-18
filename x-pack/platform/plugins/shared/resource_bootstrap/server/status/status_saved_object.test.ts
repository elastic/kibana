/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core/server';
import type { BootstrapStatusAttributes } from '../../common';
import { statusSavedObjectType } from './status_saved_object';

type ModelVersions = Exclude<SavedObjectsType['modelVersions'], undefined | (() => unknown)>;

const { create } = (statusSavedObjectType.modelVersions as ModelVersions)['1']?.schemas as {
  create: { validate: (value: unknown) => unknown };
};

// Typed as `Required`, so a field added to the attributes must be added here, and then to the schema.
const everyField: Required<BootstrapStatusAttributes> = {
  hash: 'h1',
  status: 'completed',
  startedAt: '2026-11-18T10:00:00.000Z',
  finishedAt: '2026-11-18T10:00:05.000Z',
  kinds: { data_view: { applied: 2, created: 1, unchanged: 0, failed: 0, pruned: 1 } },
  errors: [{ kind: 'data_view', spaceId: 'default', id: 'a', message: 'failed' }],
  coveredRequestNumber: 4,
  settingsHash: 's1',
  finishedRequestNumber: 5,
  revision: 7,
};

describe('the status saved object type', () => {
  it('accepts a record with every field, since the schema is strict', () => {
    expect(create.validate(everyField)).toEqual(everyField);
  });

  it('accepts a record with only the required fields', () => {
    const record: BootstrapStatusAttributes = {
      hash: null,
      status: 'running',
      kinds: {},
      errors: [],
    };

    expect(create.validate(record)).toEqual(record);
  });

  it('accepts a revision of zero and rejects a negative one', () => {
    expect(() => create.validate({ ...everyField, revision: 0 })).not.toThrow();
    expect(() => create.validate({ ...everyField, revision: -1 })).toThrow();
  });
});
