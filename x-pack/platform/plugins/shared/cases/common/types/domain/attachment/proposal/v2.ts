/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { PROPOSAL_ATTACHMENT_TYPE } from '../../../../constants/attachments';

/** Matches the proposals plugin's own id and title bounds. */
const MAX_PROPOSAL_ID_LENGTH = 256;
const MAX_PROPOSAL_TITLE_LENGTH = 256;

/**
 * Stored on the case so a row can be labelled without reading the proposal, and so the chain can
 * be read in one request. Status and decision are left out on purpose: they are read live.
 */
export const ProposalAttachmentMetadataSchema = lazySchema(() =>
  z
    .object({
      title: z.string().max(MAX_PROPOSAL_TITLE_LENGTH),
      /** First proposal of the revision chain, so a later revision can be shown as related. */
      rootProposalId: z.string().max(MAX_PROPOSAL_ID_LENGTH),
    })
    .strict()
);

export type ProposalAttachmentMetadata = z.infer<typeof ProposalAttachmentMetadataSchema>;

/** A proposal on a case: a reference whose `attachmentId` is the proposal id. */
export const ProposalAttachmentPayloadSchema = lazySchema(() =>
  z
    .object({
      type: z.literal(PROPOSAL_ATTACHMENT_TYPE),
      owner: z.string().max(100),
      attachmentId: z.string().max(MAX_PROPOSAL_ID_LENGTH),
      metadata: ProposalAttachmentMetadataSchema,
    })
    .strict()
);

export type ProposalAttachmentPayload = z.infer<typeof ProposalAttachmentPayloadSchema>;
