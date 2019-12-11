/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ensureDeprecatedFieldsAreCorrected } from './correct_deprecated_fields';

describe('ensureDeprecatedFieldsAreCorrected', () => {
  test('doesnt change tasks without any schedule fields', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected({
        id: 'my-foo-id',
        taskType: 'foo',
        params: {},
        state: {},
      })
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      params: {},
      state: {},
    });
  });
  test('doesnt change tasks with the recurringSchedule field', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected({
        id: 'my-foo-id',
        taskType: 'foo',
        recurringSchedule: '10m',
        params: {},
        state: {},
      })
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      recurringSchedule: '10m',
      params: {},
      state: {},
    });
  });
  test('corrects tasks with the deprecated inteval field', async () => {
    expect(
      ensureDeprecatedFieldsAreCorrected({
        id: 'my-foo-id',
        taskType: 'foo',
        interval: '10m',
        params: {},
        state: {},
      })
    ).toEqual({
      id: 'my-foo-id',
      taskType: 'foo',
      recurringSchedule: '10m',
      params: {},
      state: {},
    });
  });
});
