/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPatch } from 'diff';

const PATCH_HEADER_LINES = 4;

/**
 * Returns a unified diff (3 lines of context) between two YAML versions, without the file header.
 */
export const createYamlDiff = (before: string, after: string): string =>
  createPatch('workflow.yaml', before, after, '', '', { context: 3 })
    .split('\n')
    .slice(PATCH_HEADER_LINES)
    .join('\n');
