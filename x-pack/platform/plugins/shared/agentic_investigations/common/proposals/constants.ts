/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENTIC_INVESTIGATIONS_INTERNAL_URL } from '../constants';

/**
 * The `.kibana-` prefix is deliberate and permanent: `.kibana*` is already
 * granted to the `kibana_system` role, so this index needs no Elasticsearch-side
 * system index registration. `anonymization` ships
 * `.kibana-anonymization-profiles` on the same reasoning. Each entity this
 * plugin owns gets its own index rather than one discriminated by type.
 */
export const PROPOSALS_INDEX_NAME = '.kibana-investigation-proposals' as const;

export const PROPOSALS_INTERNAL_URL = `${AGENTIC_INVESTIGATIONS_INTERNAL_URL}/proposals` as const;
export const PROPOSAL_BY_ID_URL = `${PROPOSALS_INTERNAL_URL}/{id}` as const;
export const PROPOSAL_APPROVE_URL = `${PROPOSALS_INTERNAL_URL}/{id}/approve` as const;
export const PROPOSAL_DISMISS_URL = `${PROPOSALS_INTERNAL_URL}/{id}/dismiss` as const;

/**
 * UI capabilities. Capabilities are namespaced by feature id rather than by
 * sub-feature, so each entity scopes its own names.
 */
export const PROPOSALS_UI_CAPABILITY_SHOW = 'showProposals' as const;
export const PROPOSALS_UI_CAPABILITY_DECIDE = 'decideProposals' as const;

/** Channel recorded on the workflow resume, for audit. */
export const PROPOSALS_RESUME_CHANNEL = 'investigation_proposals_api' as const;
