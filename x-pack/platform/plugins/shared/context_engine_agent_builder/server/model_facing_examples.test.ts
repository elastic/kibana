/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const DOMAIN_EXAMPLE =
  /raw-cases|case_number|support (case|article)|case records|case corpus|resolved case|case header|hosts, cases|articles, cases|host, case\)|loyalty|flight[-_ ]activity|\btickets?\b|zendesk|browsecomp/i;

const textFilesUnder = (dir: string): string[] =>
  readdirSync(join(__dirname, dir), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.text'))
    .map((file) => join(dir, file));

const toolDescriptionFiles = readdirSync(join(__dirname, 'agent_builder/tools'))
  .map((tool) => join('agent_builder/tools', tool, 'tool.ts'))
  .filter((file) => existsSync(join(__dirname, file)));

const modelFacingFiles = [
  ...textFilesUnder('agent'),
  ...textFilesUnder('agent_builder/tools'),
  ...toolDescriptionFiles,
];

describe('model-facing examples', () => {
  it('finds the instructions, templates and tool descriptions', () => {
    expect(modelFacingFiles).toEqual(
      expect.arrayContaining([
        'agent/instructions/context_engine_setup.md.text',
        'agent_builder/tools/install_automation_template/document_template.yaml.text',
        'agent_builder/tools/install_automation_template/tool.ts',
        'agent_builder/tools/run_automation/tool.ts',
      ])
    );
  });

  it.each(modelFacingFiles)('keeps %s outside any one data domain', (file) => {
    expect(readFileSync(join(__dirname, file), 'utf8')).not.toMatch(DOMAIN_EXAMPLE);
  });
});
