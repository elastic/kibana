/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { bulkUpdateAlertTags } from './bulk_update_alert_tags';

const http = httpServiceMock.createStartContract();

describe('bulkUpdateAlertTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call tags API with add and remove', async () => {
    await bulkUpdateAlertTags({
      http,
      alertIds: ['a1', 'a2'],
      index: '.alerts-obs',
      add: ['new-tag'],
      remove: ['old-tag'],
    });

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        alertIds: ['a1', 'a2'],
        index: '.alerts-obs',
        add: ['new-tag'],
        remove: ['old-tag'],
      }),
    });
  });

  test('should omit add when empty', async () => {
    await bulkUpdateAlertTags({
      http,
      alertIds: ['a1'],
      index: '.alerts-obs',
      add: [],
      remove: ['old-tag'],
    });

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        alertIds: ['a1'],
        index: '.alerts-obs',
        remove: ['old-tag'],
      }),
    });
  });

  test('should omit remove when empty', async () => {
    await bulkUpdateAlertTags({
      http,
      alertIds: ['a1'],
      index: '.alerts-obs',
      add: ['new-tag'],
      remove: [],
    });

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        alertIds: ['a1'],
        index: '.alerts-obs',
        add: ['new-tag'],
      }),
    });
  });

  test('should omit both add and remove when undefined', async () => {
    await bulkUpdateAlertTags({
      http,
      alertIds: ['a1'],
      index: '.alerts-obs',
    });

    expect(http.post).toHaveBeenCalledWith('/internal/rac/alerts/tags', {
      body: JSON.stringify({
        alertIds: ['a1'],
        index: '.alerts-obs',
      }),
    });
  });
});
