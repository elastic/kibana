/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { jsonValueRt } from '../../../api';
import {
  AttachmentAttributesBasicRt,
  AttachmentAttributesRt,
  AttachmentPatchAttributesRt,
  AttachmentRt,
} from './v1';

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
    owner: rt.string,
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
    owner: rt.string,
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
 * Saved Object attributes for Unified Attachments
 * Contains the payload and the basic attributes
 */
export const UnifiedAttachmentAttributesRt = rt.intersection([
  UnifiedAttachmentPayloadRt,
  AttachmentAttributesBasicRt,
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

/**
 * Partial payload props for patch (reference and value). We define these explicitly because
 * UnifiedReferenceAttachmentPayloadRt and UnifiedValueAttachmentPayloadRt are rt.intersection([...]),
 * so they have no .type.props (only rt.strict() codecs have .props); v1 payloads use rt.strict()
 * so AttachmentPatchAttributesRt can use .type.props there.
 */
const UnifiedReferenceAttachmentPayloadPartialRt = rt.exact(
  rt.partial({
    type: rt.string,
    owner: rt.string,
    attachmentId: rt.string,
    data: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
    metadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
  })
);
const UnifiedValueAttachmentPayloadPartialRt = rt.exact(
  rt.partial({
    type: rt.string,
    owner: rt.string,
    data: rt.record(rt.string, jsonValueRt),
    metadata: rt.union([rt.null, rt.record(rt.string, jsonValueRt)]),
  })
);

export const UnifiedAttachmentPatchAttributesRt = rt.intersection([
  rt.union([UnifiedReferenceAttachmentPayloadPartialRt, UnifiedValueAttachmentPayloadPartialRt]),
  rt.exact(rt.partial(AttachmentAttributesBasicRt.type.props)),
]);

export type UnifiedReferenceAttachmentPayload = rt.TypeOf<
  typeof UnifiedReferenceAttachmentPayloadRt
>;
export type UnifiedValueAttachmentPayload = rt.TypeOf<typeof UnifiedValueAttachmentPayloadRt>;
export type UnifiedAttachmentPayload = rt.TypeOf<typeof UnifiedAttachmentPayloadRt>;
export type UnifiedAttachmentAttributes = rt.TypeOf<typeof UnifiedAttachmentAttributesRt>;
export type UnifiedAttachment = rt.TypeOf<typeof UnifiedAttachmentRt>;

/**
 * Transitional read-shape mode while v1/v2 attachments coexist.
 */
export type AttachmentMode = 'legacy' | 'unified';

/**
 * Combined v1 legacy and v2 unified attachment types
 */
export const AttachmentRtV2 = rt.union([AttachmentRt, UnifiedAttachmentRt]);
export const AttachmentsRtV2 = rt.array(AttachmentRtV2);
export const AttachmentAttributesRtV2 = rt.union([
  AttachmentAttributesRt,
  UnifiedAttachmentAttributesRt,
]);
export const AttachmentPatchAttributesRtV2 = rt.union([
  AttachmentPatchAttributesRt,
  UnifiedAttachmentPatchAttributesRt,
]);
export type AttachmentV2 = rt.TypeOf<typeof AttachmentRtV2>;
export type AttachmentsV2 = rt.TypeOf<typeof AttachmentsRtV2>;
export type AttachmentAttributesV2 = rt.TypeOf<typeof AttachmentAttributesRtV2>;
export type AttachmentPatchAttributesV2 = rt.TypeOf<typeof AttachmentPatchAttributesRtV2>;
