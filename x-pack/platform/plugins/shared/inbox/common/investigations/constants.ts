/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INBOX_INTERNAL_URL } from '@kbn/inbox-common';

export const INBOX_INVESTIGATIONS_URL = `${INBOX_INTERNAL_URL}/investigations` as const;
export const INBOX_INVESTIGATION_URL_TEMPLATE =
  `${INBOX_INVESTIGATIONS_URL}/{conversationId}` as const;

export const buildInvestigationUrl = (conversationId: string) =>
  `${INBOX_INVESTIGATIONS_URL}/${encodeURIComponent(conversationId)}`;

/** Attachment id written by watch_floor materialize_investigation steps. */
export const DAYBREAK_PROPOSAL_ATTACHMENT_ID = 'daybreak-proposal' as const;

/** Attachment id for triage evidence written by watch_floor. */
export const DAYBREAK_EVIDENCE_ATTACHMENT_ID = 'daybreak-evidence' as const;

/** State key for the proposal envelope on Agent Builder conversations.
 *  POC workaround: written via experimental PUT (see #15192 metadata PATCH for the supported path).
 *  Stored in non-queryable `state` — inbox projection reads it for queue/flyout until typed metadata exists. */
export const DAYBREAK_PROPOSAL_STATE_KEY = 'daybreak_proposal' as const;
