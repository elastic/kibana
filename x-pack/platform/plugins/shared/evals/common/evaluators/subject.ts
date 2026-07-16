/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * What to grade within a trace: the whole `conversation` (user/agent messages) or a
 * single `tool-call` (the tool's arguments and result).
 */
export const SUBJECT_KINDS = ['conversation', 'tool-call'] as const;

export type SubjectKind = (typeof SUBJECT_KINDS)[number];
