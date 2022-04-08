/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { log } from '../lib/log.ts';
import { EsMapping, EsMappings } from '../lib/types.ts';
import { createLineWriter, LineWriter } from '../lib/line_writer.ts';
import { esTypeToTsType } from '../lib/type_names.ts';

export async function generateTypeScriptTypes(baseFileName: string, allMappings: EsMapping[]) {
  const oFileName = `${baseFileName}_types.ts`;
  log(`generating: ${oFileName}`);

  const lineWriter = createLineWriter();

  lineWriter.addLine(await getCopyrightLines());

  for (const mappings of allMappings) {
    const isMappings = mappings.usage === 'mappings';
    const { name, description, properties } = mappings;

    if (description) lineWriter.addLine(`\n/** ${description} */`);
    lineWriter.addLine(`export interface ${capitalize(name)} {`);
    lineWriter.indent();

    if (properties) {
      if (isMappings) {
        generateRecordContentMappings(lineWriter, properties);
      } else {
        generateRecordContentGeneral(lineWriter, properties);
      }
    }

    lineWriter.dedent();
    lineWriter.addLine('}\n');
  }

  const content = lineWriter.getContent();
  await Deno.writeTextFile(oFileName, content);
}

export function generateRecordContentMappings(lineWriter: LineWriter, properties: EsMappings) {
  for (const name of Object.keys(properties)) {
    const subProperties = properties[name];
    const { type } = subProperties;
    if (subProperties.description) {
      lineWriter.addLine(`\n/** ${subProperties.description} */`);
    }
    if (subProperties.properties == null) {
      lineWriter.addLine(`${name}?: ${esTypeToTsType(type)} | null;`);
    } else {
      if (objectIsEmpty(subProperties.properties)) {
        lineWriter.addLine(`${name}?: Record<string, any>;`);
      } else {
        lineWriter.addLine(`${name}?: {`);
        lineWriter.indent();

        generateRecordContentMappings(lineWriter, subProperties.properties);

        lineWriter.dedent();
        if (type === 'nested') {
          lineWriter.addLine(`}[] | null;`);
        } else {
          lineWriter.addLine(`} | null;`);
        }
      }
    }
  }
}

export function generateRecordContentGeneral(lineWriter: LineWriter, properties: EsMappings) {
  for (const name of Object.keys(properties)) {
    const subProperties = properties[name];
    if (subProperties.description) {
      lineWriter.addLine(`\n/** ${subProperties.description} */`);
    }
    const { optional, type } = subProperties;
    const optSuffix = optional ? '?' : '';
    if (subProperties.properties == null) {
      lineWriter.addLine(`${name}${optSuffix}: ${esTypeToTsType(type)};`);
    } else {
      if (objectIsEmpty(subProperties.properties)) {
        lineWriter.addLine(`${name}${optSuffix}: Record<string, any>;`);
      } else {
        lineWriter.addLine(`${name}${optSuffix}: {`);
        lineWriter.indent();

        generateRecordContentGeneral(lineWriter, subProperties.properties);

        lineWriter.dedent();
        if (type === 'nested') {
          lineWriter.addLine(`}[];`);
        } else {
          lineWriter.addLine(`};`);
        }
      }
    }
  }
}

const __filename = new URL('', import.meta.url).pathname;

export async function getCopyrightLines() {
  const content = await Deno.readTextFile(__filename, {});
  const result = [];

  for (const line of content.split('\n')) {
    result.push(line);
    if (line.trim() === '*/') break;
  }

  return result.join('\n');
}

export function capitalize(string: string): string {
  return string.slice(0, 1).toUpperCase() + string.slice(1);
}

export function objectIsEmpty(object: Record<string, unknown>): boolean {
  return !Object.keys(object).length;
}
