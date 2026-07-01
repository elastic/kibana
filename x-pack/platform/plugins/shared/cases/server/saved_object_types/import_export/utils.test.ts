/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_USER_ACTION_SAVED_OBJECT,
} from '../../../common/constants';
import { getAttachmentsAndUserActionsForCases } from './utils';

describe('import_export utils', () => {
  it('always exports attachments from both legacy and unified attachment saved object types', async () => {
    const createPointInTimeFinder = jest.fn().mockReturnValue({
      async *find() {
        yield { saved_objects: [] };
      },
    });
    const savedObjectsClient = {
      createPointInTimeFinder,
    } as unknown as SavedObjectsClientContract;

    await getAttachmentsAndUserActionsForCases(savedObjectsClient, ['case-id']);

    expect(createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: [CASE_COMMENT_SAVED_OBJECT, CASE_ATTACHMENT_SAVED_OBJECT],
      })
    );
    expect(createPointInTimeFinder).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CASE_USER_ACTION_SAVED_OBJECT,
      })
    );
  });
});
