/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { UserActionTypes } from '../action/v1';

export const BulkAttachmentsPayloadRt = rt.strict({
  /** The unified attachment type, e.g. `security.alert` or `file`. */
  attachmentType: rt.string,
  /**
   * The removed items, e.g. alerts or files, counted once each. An attachment that references
   * nothing counts as 1 item.
   */
  count: rt.number,
});

export const BulkAttachmentsUserActionPayloadRt = rt.strict({
  bulkAttachments: BulkAttachmentsPayloadRt,
});

export const BulkAttachmentsUserActionRt = rt.strict({
  type: rt.literal(UserActionTypes.bulkAttachments),
  payload: BulkAttachmentsUserActionPayloadRt,
});

export type BulkAttachmentsPayload = rt.TypeOf<typeof BulkAttachmentsPayloadRt>;
