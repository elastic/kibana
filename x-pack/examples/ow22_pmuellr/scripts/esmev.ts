#!/usr/bin/env deno run --allow-read --allow-write
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as yaml from 'https://deno.land/std@0.133.0/encoding/yaml.ts';
import * as toml from 'https://deno.land/std@0.133.0/encoding/toml.ts';

import { log, logExit } from './lib/log.ts';
import { readEsMappings } from './lib/mappings_reader.ts';
import { EsMapping } from './lib/types.ts';
import { ensureJsonObject } from './lib/util.ts';
import { generateConfigSchema, generateMarkdown, generateTypeScriptTypes } from './gen/index.ts';

type EsMappings = Record<string, EsMapping>;

main();

async function main() {
  // read from file, if file name passed in
  const fileNames = Deno.args;

  for (const fileName of fileNames) {
    log(`processing: ${fileName}`);
    const json = await parseFile(fileName);
    const jsonObject = ensureJsonObject(json);

    for (const name of Object.keys(jsonObject)) {
      const mappingsSource = jsonObject[name];
      const mappings = readEsMappings(name, mappingsSource);

      if (typeof mappings === 'string') {
        return logExit(1, mappings);
      }

      const baseFileName = getBaseFileName(fileName);
      await generateEsMappings(baseFileName, json);
      await generateConfigSchema(baseFileName, mappings);
      await generateTypeScriptTypes(baseFileName, mappings);
      await generateMarkdown(baseFileName, mappings);
    }
  }
}

async function generateEsMappings(baseFileName: string, json: unknown) {
  const oFileName = `${baseFileName}_mappings.json`;
  log(`generating: ${oFileName}`);

  const content = JSON.stringify(json, $remover, 2);
  await Deno.writeTextFile(oFileName, `${content}\n`);

  function $remover(key: string, value: unknown) {
    if (key.startsWith('$')) return;
    return value;
  }
}

async function parseFile(fileName: string): Promise<unknown> {
  const content = await Deno.readTextFile(fileName, {});

  if (fileName.endsWith('.json')) return JSON.parse(content);
  if (fileName.endsWith('.yaml')) return yaml.parse(content);
  if (fileName.endsWith('.toml')) return toml.parse(content);

  return logExit(1, `unknown file type for "${fileName}"`);
}

function getBaseFileName(fileName: string): string {
  const parts = fileName.split('.');
  parts.pop();
  return parts.join('.');
}
