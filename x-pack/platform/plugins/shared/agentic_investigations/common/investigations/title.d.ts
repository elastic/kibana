/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Whether Agent Builder has not generated the investigation conversation's title yet. An
 * investigation is created without a title (Agent Builder stores its placeholder), and Agent
 * Builder titles it from the first round; until then UIs show a fallback instead.
 */
export declare const isInvestigationTitlePending: (title: string | undefined) => boolean;
