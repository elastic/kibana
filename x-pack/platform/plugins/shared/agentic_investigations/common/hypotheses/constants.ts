/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export const HYPOTHESES_ATTACHMENT_TYPE = 'investigation_hypotheses' as const;

/** One document per space and conversation. See README "Index naming". */
export const HYPOTHESES_INDEX_NAME = '.kibana-investigation-hypotheses' as const;

/** Hypotheses one investigation tracks. Matches the Nightshift progress report. */
export const MAX_HYPOTHESES = 50;

/** Evidence entries per hypothesis. Matches the Nightshift progress report. */
export const MAX_HYPOTHESIS_EVIDENCE = 3;

export const HYPOTHESIS_STATUSES = ['investigating', 'dismissed', 'confirmed'] as const;

/** Agent Builder builtin tool that records an investigation's hypotheses. */
export const SET_HYPOTHESES_TOOL_ID = 'agentic_investigations.set_hypotheses' as const;
