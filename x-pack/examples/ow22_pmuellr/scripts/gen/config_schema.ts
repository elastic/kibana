#!/usr/bin/env deno run --allow-read --allow-write
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { basename } from 'https://deno.land/std@0.134.0/path/mod.ts';

import { log } from '../lib/log.ts';
import { EsMapping, EsMappings } from '../lib/types.ts';
import { createLineWriter, LineWriter } from '../lib/line_writer.ts';
import { capitalize, getCopyrightLines, objectIsEmpty } from './typescript_types.ts';
import { esTypeToTsType } from '../lib/type_names.ts';

export async function generateConfigSchema(baseFileName: string, mappings: EsMapping) {
  const oFileName = `${baseFileName}_schema.ts`;
  log(`generating: ${oFileName}`);

  const isMappings = mappings.usage === 'mappings';

  const lineWriter = createLineWriter();

  const { name, description, properties } = mappings;
  lineWriter.addLine(await getCopyrightLines());

  lineWriter.addLine(`import { schema, TypeOf } from '@kbn/config-schema';`);
  lineWriter.addLine(`import semver from 'semver';`);
  lineWriter.addLine(``);
  lineWriter.addLine(`import { ${capitalize(name)} } from './${basename(baseFileName)}_types';`);

  if (description) lineWriter.addLine(`\n/** ${description} */`);

  lineWriter.addLine(`export const ${capitalize(name)}Schema = schema.maybe(`);
  lineWriter.indent();
  lineWriter.addLine(`schema.nullable(`);
  lineWriter.indent();
  lineWriter.addLine(`schema.object({`);
  lineWriter.indent();

  if (properties) {
    if (isMappings) {
      generateRecordContentMappings(lineWriter, properties);
    } else {
      // generateRecordContentGeneral(lineWriter, properties);
    }
  }

  lineWriter.dedent();
  lineWriter.addLine('})');
  lineWriter.dedent();
  lineWriter.addLine(')');
  lineWriter.dedent();
  lineWriter.addLine(');');
  lineWriter.addLine('');
  // eslint-disable-next-line prettier/prettier
  lineWriter.addLine(`export function validate${capitalize(name)}(data: unknown): ${capitalize(name)} {`);
  lineWriter.addLine(`  return ${capitalize(name)}Schema.validate(data);`);
  lineWriter.addLine('}\n');

  const content = lineWriter.getContent();
  await Deno.writeTextFile(oFileName, content);
}

export function generateRecordContentMappings(lineWriter: LineWriter, properties: EsMappings) {
  for (const name of Object.keys(properties)) {
    const subProperties = properties[name];
    const type = esTypeToTsType(subProperties.type);

    if (subProperties.description) {
      lineWriter.addLine(`/** ${subProperties.description} */`);
    }
    if (subProperties.properties == null) {
      const actualType = type !== 'object' ? type : 'any';
      lineWriter.addLine(`${name}: schema.maybe(schema.nullable(schema.${actualType}())),`);
    } else {
      if (objectIsEmpty(subProperties.properties)) {
        lineWriter.addLine(`${name}: schema.maybe(schema.nullable(schema.any())),`);
      } else {
        lineWriter.addLine(`${name}: schema.object({`);
        lineWriter.indent();

        generateRecordContentMappings(lineWriter, subProperties.properties);

        lineWriter.dedent();
        lineWriter.addLine(`}),`);
      }
    }
  }
}
