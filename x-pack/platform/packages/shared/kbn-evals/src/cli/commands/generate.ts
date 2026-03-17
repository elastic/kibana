/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import { createFlagError } from '@kbn/dev-cli-errors';
import type { Command } from '@kbn/dev-cli-runner';
import { generateTestsFromToolSchema, type JSONSchema } from '../../generation/schema_walker';
import type { Example } from '../../types';

const formatAsTypescript = (examples: Example[]): string => {
  const lines = [
    `import type { Example } from '@kbn/evals';`,
    '',
    `export const generatedDataset: Example[] = ${JSON.stringify(examples, null, 2)};`,
  ];
  return lines.join('\n');
};

export const generateCmd: Command<void> = {
  name: 'generate',
  description: `
  Generate synthetic test examples from a tool's JSON Schema.

  Examples:
    node scripts/evals generate --schema tool_schema.json --count 10 --difficulty moderate
    node scripts/evals generate --schema tool_schema.json --count 5 --difficulty simple --output examples.json
  `,
  flags: {
    string: ['schema', 'count', 'difficulty', 'output', 'output-format'],
    default: { count: '10', difficulty: 'moderate', 'output-format': 'json' },
  },
  run: async ({ log, flagsReader }) => {
    const schemaPath = flagsReader.string('schema');
    if (!schemaPath) {
      throw createFlagError('Missing --schema <path-to-json-schema>');
    }

    const resolvedSchemaPath = Path.resolve(process.cwd(), schemaPath);
    if (!Fs.existsSync(resolvedSchemaPath)) {
      throw createFlagError(`Schema file not found: ${resolvedSchemaPath}`);
    }

    const rawCount = flagsReader.string('count') ?? '10';
    const count = parseInt(rawCount, 10);
    if (!Number.isFinite(count) || count < 1) {
      throw createFlagError('--count must be a positive integer');
    }

    const difficulty = flagsReader.string('difficulty') ?? 'moderate';
    if (!['simple', 'moderate', 'complex'].includes(difficulty)) {
      throw createFlagError('--difficulty must be one of: simple, moderate, complex');
    }

    const outputFormat = flagsReader.string('output-format') ?? 'json';
    if (outputFormat !== 'json' && outputFormat !== 'typescript') {
      throw createFlagError('--output-format must be "json" or "typescript"');
    }

    const schemaRaw = Fs.readFileSync(resolvedSchemaPath, 'utf-8');
    let toolSchema: JSONSchema;
    try {
      toolSchema = JSON.parse(schemaRaw) as JSONSchema;
    } catch {
      throw createFlagError(`Failed to parse schema file as JSON: ${resolvedSchemaPath}`);
    }

    log.info(`Generating ${count} examples with difficulty="${difficulty}" from ${schemaPath}`);

    const examples = generateTestsFromToolSchema(toolSchema, {
      count,
      difficulty: difficulty as 'simple' | 'moderate' | 'complex',
    });

    const content =
      outputFormat === 'typescript'
        ? formatAsTypescript(examples)
        : JSON.stringify(examples, null, 2);

    const outputPath = flagsReader.string('output');
    if (outputPath) {
      const resolvedOutput = Path.resolve(process.cwd(), outputPath);
      Fs.writeFileSync(resolvedOutput, content, 'utf-8');
      log.info(`Wrote ${examples.length} examples to ${resolvedOutput}`);
    } else {
      process.stdout.write(`${content}\n`);
    }

    log.info(`Generated ${examples.length} examples`);
    log.info(
      "To promote this dataset: review the output, commit to your suite's dataset files, and run in CI."
    );
  },
};
