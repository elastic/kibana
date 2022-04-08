#!/usr/bin/env deno run --allow-read --allow-write
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log } from '../lib/log.ts';
import { EsMapping } from '../lib/types.ts';
import { createLineWriter } from '../lib/line_writer.ts';
import { generateRecordContentGeneral } from './typescript_types.ts';

export async function generateMarkdown(baseFileName: string, mappings: EsMapping) {
  const oFileName = `${baseFileName}_doc.md`;
  log(`generating: ${oFileName}`);
  const lineWriter = createLineWriter();

  const { name, description, properties } = mappings;
  lineWriter.addLine(`# ${name}`);

  if (description) lineWriter.addLine(`\n${description}`);

  lineWriter.addLine('\n```');
  lineWriter.addLine('{');
  lineWriter.indent();

  if (properties) {
    generateRecordContentGeneral(lineWriter, properties);
  }

  lineWriter.dedent();
  lineWriter.addLine('}');
  lineWriter.addLine('```\n');

  const content = lineWriter.getContent();
  await Deno.writeTextFile(oFileName, content);
}
