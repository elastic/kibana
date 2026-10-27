/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const CONTEXT_ENGINE_SKILL_DIRS = [
  'analyze_and_improve',
  'ai_index_automations',
  'context_engine_shared',
] as const;

const DOMAIN_EXAMPLE =
  /raw-cases|case_number|support (case|article)|case records|case corpus|resolved case|case header|hosts, cases|articles, cases|host, case\)|loyalty|flight[-_ ]activity|\btickets?\b|zendesk|browsecomp/i;

const modelFacingFiles = CONTEXT_ENGINE_SKILL_DIRS.flatMap((dir) =>
  readdirSync(join(__dirname, dir))
    .filter((file) => file.endsWith('.text'))
    .map((file) => join(dir, file))
);

describe('Context Engine skill examples', () => {
  it('finds the model-facing skill files', () => {
    expect(modelFacingFiles.length).toBeGreaterThanOrEqual(4);
  });

  it.each(modelFacingFiles)('keeps %s outside any one data domain', (file) => {
    expect(readFileSync(join(__dirname, file), 'utf8')).not.toMatch(DOMAIN_EXAMPLE);
  });
});
