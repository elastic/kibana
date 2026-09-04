/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';

const AGENT_BUILDER_DIR = Path.resolve(__dirname);

const readToolFiles = () =>
  Fs.readdirSync(AGENT_BUILDER_DIR)
    .filter((file) => file.endsWith('_tool.ts'))
    .map((file) => ({ file, source: Fs.readFileSync(Path.join(AGENT_BUILDER_DIR, file), 'utf8') }));

/**
 * Structural guard for the whole Osquery Agent Builder tool surface.
 *
 * `tool_privilege_parity.test.ts` proves each *registered* tool denies an
 * unprivileged caller. This file catches the class of defect one level up: a
 * newly added tool file that never wires a privilege check at all, or that
 * silently accepts a documented schema parameter and ignores it.
 *
 * Both patterns are what turned into review findings on the first pass, and
 * neither is visible to a unit test that only exercises the tools it already
 * knows about.
 */
describe('Osquery Agent Builder tool surface', () => {
  it('has at least one tool file to check', () => {
    expect(readToolFiles().length).toBeGreaterThan(0);
  });

  it('every tool asserts an Osquery privilege before doing work', () => {
    const offenders = readToolFiles()
      .filter(({ source }) => !source.includes('hasOsqueryToolPrivilege'))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('no tool accepts a schema parameter and discards it via an underscore alias', () => {
    // `const { platform: _platform } = input` is the shape that shipped
    // `list_packs.enabled` and `get_table_schema.platform` as no-ops.
    const offenders = readToolFiles()
      .filter(({ source }) => /:\s*_[a-zA-Z][a-zA-Z0-9_]*\s*[,}]/.test(source))
      .map(({ file }) => file);

    expect(offenders).toEqual([]);
  });

  it('every tool declares all five MCP annotations', () => {
    // `McpToolAnnotations` types these as Required<>, so an omission is also a
    // type error — but all seven tools survived a clean merge of the commit
    // that introduced the field with zero annotations and only CI caught it.
    // Assert the surface structurally so a new tool file cannot repeat that.
    const REQUIRED = [
      'title',
      'readOnlyHint',
      'destructiveHint',
      'idempotentHint',
      'openWorldHint',
    ];
    for (const { file, source } of readToolFiles()) {
      const block = source.match(/^ {2}annotations: \{$([\s\S]*?)^ {2}\},$/m);
      expect([file, Boolean(block)]).toEqual([file, true]);
      const missing = REQUIRED.filter((key) => !new RegExp(`^\\s*${key}:`, 'm').test(block![1]));
      expect([file, missing]).toEqual([file, []]);
    }
  });

  it('no tool claims to be both read-only and destructive', () => {
    // Mutually exclusive per the MCP annotation guide: a tool asserting both
    // tells the client nothing and silently defeats the classification.
    const offenders = readToolFiles()
      .filter(({ source }) => {
        const block = source.match(/^ {2}annotations: \{$([\s\S]*?)^ {2}\},$/m);

        return (
          !!block && /readOnlyHint: true/.test(block[1]) && /destructiveHint: true/.test(block[1])
        );
      })
      .map(({ file }) => file);
    expect(offenders).toEqual([]);
  });

  it('live-query result reads are space-scoped', () => {
    const resultReaders = readToolFiles().filter(
      ({ source }) =>
        source.includes('pollActionResponses') || source.includes('assertActionBelongsToSpace')
    );

    expect(resultReaders.length).toBeGreaterThan(0);
    for (const { file, source } of resultReaders) {
      expect([file, source.includes('spaceId')]).toEqual([file, true]);
    }
  });
});
