/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TASK_SO_NAME } from '../../saved_objects';
import {
  buildSavedObjectBulkUpdatesForUiamKeys,
  invalidationTargetsFromUiamTaskBulkUpdates,
} from './build_saved_object_bulk_updates_for_uiam';

describe('buildSavedObjectBulkUpdatesForUiamKeys', () => {
  it('merges uiamApiKeyId onto existing userScope and passes version when present', () => {
    const updates = buildSavedObjectBulkUpdatesForUiamKeys([
      {
        taskId: 'a',
        uiamApiKey: 'b64a',
        uiamApiKeyId: 'uiam-a',
        attributes: {
          apiKey: 'k',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'es-a', apiKeyCreatedByUser: false },
        },
        version: '1',
      },
      {
        taskId: 'b',
        uiamApiKey: 'b64b',
        uiamApiKeyId: 'uiam-b',
        attributes: {
          apiKey: 'k2',
          taskType: 'actions:.email',
          userScope: { apiKeyId: 'es-b', apiKeyCreatedByUser: false, spaceId: 's' },
        },
      },
    ]);

    expect(updates).toEqual([
      {
        type: TASK_SO_NAME,
        id: 'a',
        attributes: {
          uiamApiKey: 'b64a',
          userScope: { apiKeyId: 'es-a', apiKeyCreatedByUser: false, uiamApiKeyId: 'uiam-a' },
          taskType: 'alerting:.index-threshold',
        },
        version: '1',
        mergeAttributes: true,
      },
      {
        type: TASK_SO_NAME,
        id: 'b',
        attributes: {
          uiamApiKey: 'b64b',
          userScope: {
            apiKeyId: 'es-b',
            apiKeyCreatedByUser: false,
            spaceId: 's',
            uiamApiKeyId: 'uiam-b',
          },
          taskType: 'actions:.email',
        },
        mergeAttributes: true,
      },
    ]);
  });

  it('always carries taskType in the partial update payload (required for ESO AAD)', () => {
    const updates = buildSavedObjectBulkUpdatesForUiamKeys([
      {
        taskId: 'a',
        uiamApiKey: 'b64a',
        uiamApiKeyId: 'uiam-a',
        attributes: {
          apiKey: 'k',
          taskType: 'task_manager:invalidate_api_keys',
          userScope: { apiKeyId: 'es-a', apiKeyCreatedByUser: false },
        },
      },
    ]);
    expect(updates[0].attributes?.taskType).toBe('task_manager:invalidate_api_keys');
  });
});

describe('invalidationTargetsFromUiamTaskBulkUpdates', () => {
  it('reads UIAM id from merged userScope and uiamApiKey from attributes', () => {
    const updates = buildSavedObjectBulkUpdatesForUiamKeys([
      {
        taskId: 'a',
        uiamApiKey: 'b64a',
        uiamApiKeyId: 'uiam-a',
        attributes: {
          apiKey: 'k',
          taskType: 'task_manager:invalidate_api_keys',
          userScope: { apiKeyId: 'es-a', apiKeyCreatedByUser: false },
        },
      },
    ]);
    expect(invalidationTargetsFromUiamTaskBulkUpdates(updates)).toEqual([
      { apiKeyId: 'uiam-a', uiamApiKey: 'b64a' },
    ]);
  });
});
