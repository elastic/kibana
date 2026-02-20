/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { jsonValueRt } from '../../../api';
import { UserRt } from '../user/v1';
import { AttachmentRt } from './v1';

/**
 * Payload for Reference-based Attachments
 * - type: always required
 * - attachmentId: required - references external entities (alerts, events, external references)
 * - metadata: optional - additional metadata about the reference
 * - data: optional - some reference attachments may also have data
 */
export const UnifiedReferenceAttachmentPayloadRt = rt.intersection([
  rt.strict({
    type: rt.string,
    attachmentId: rt.string,
  }),
  rt.exact(
    rt.partial({
      data: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
      metadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
    })
  ),
]);

/**
 * Payload for Value-based Attachments
 * - type: always required
 * - data: required - contains content/state (user comments, persistable state, visualizations)
 * - metadata: optional - additional metadata
 */
export const UnifiedValueAttachmentPayloadRt = rt.intersection([
  rt.strict({
    type: rt.string,
    data: rt.record(rt.string, jsonValueRt),
  }),
  rt.exact(
    rt.partial({
      metadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
    })
  ),
]);

export const UnifiedAttachmentPayloadRt = rt.union([
  UnifiedReferenceAttachmentPayloadRt,
  UnifiedValueAttachmentPayloadRt,
]);

/**
 * Basic attributes for Unified Attachments
 * Contains all the basic attributes minus the owner
 */
export const AttachmentAttributesBasicWithoutOwnerRt = rt.strict({
  created_at: rt.string,
  created_by: UserRt,
  pushed_at: rt.union([rt.string, rt.null]),
  pushed_by: rt.union([UserRt, rt.null]),
  updated_at: rt.union([rt.string, rt.null]),
  updated_by: rt.union([UserRt, rt.null]),
});

/**
 * Saved Object attributes for Unified Attachments
 * Contains the payload and the basic attributes
 */
export const UnifiedAttachmentAttributesRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  AttachmentAttributesBasicWithoutOwnerRt,
]);

/**
 * Full Saved Object representationfor Unified Attachments
 * Contains payload, basic attributes and id and version
 */
export const UnifiedAttachmentRt = rt.intersection([
  UnifiedAttachmentAttributesRt,
  rt.strict({
    id: rt.string,
    version: rt.string,
  }),
]);

export type UnifiedReferenceAttachmentPayload = rt.TypeOf<
  typeof UnifiedReferenceAttachmentPayloadRt
>;
export type UnifiedValueAttachmentPayload = rt.TypeOf<typeof UnifiedValueAttachmentPayloadRt>;
export type UnifiedAttachmentPayload = rt.TypeOf<typeof UnifiedAttachmentPayloadRt>;
export type UnifiedAttachmentAttributes = rt.TypeOf<typeof UnifiedAttachmentAttributesRt>;
export type UnifiedAttachment = rt.TypeOf<typeof UnifiedAttachmentRt>;

/**
 * Combined v1 legacy and v2 unified attachment types
 */
export const CombinedAttachmentRt = rt.union([AttachmentRt, UnifiedAttachmentRt]);
export type CombinedAttachment = rt.TypeOf<typeof CombinedAttachmentRt>;
