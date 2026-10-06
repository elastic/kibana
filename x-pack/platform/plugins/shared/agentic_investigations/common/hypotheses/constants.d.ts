/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Attachment type identifier registered with Agent Builder. */
export declare const HYPOTHESES_ATTACHMENT_TYPE: 'investigation_hypotheses';
/** One document per space and conversation. See README "Index naming". */
export declare const HYPOTHESES_INDEX_NAME: '.kibana-investigation-hypotheses';
/** Hypotheses one investigation tracks. Matches the Nightshift progress report. */
export declare const MAX_HYPOTHESES = 50;
/** Evidence entries per hypothesis. Matches the Nightshift progress report. */
export declare const MAX_HYPOTHESIS_EVIDENCE = 3;
export declare const HYPOTHESIS_STATUSES: readonly ['investigating', 'dismissed', 'confirmed'];
/** Agent Builder builtin tool that records an investigation's hypotheses. */
export declare const SET_HYPOTHESES_TOOL_ID: 'agentic_investigations.set_hypotheses';
