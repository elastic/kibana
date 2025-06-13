/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-console */

import fs from 'fs';
import path from 'path';

/**
 * Normalizes a value by removing URLs, special tags wrapped in "$$$", markdown links/images, and leading/trailing "!" characters.
 */
function normalizeValue(value: string): string {
  value = value.replace(/https?:\/\/[^\s|)]+/g, '');
  value = value.replace(/\$\$\$.*?\$\$\$/g, '');
  value = value.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');
  value = value.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1');
  value = value.replace(/^!+|!+$/g, '');
  return value.trim();
}

/**
 * Extracts a note from a value if it contains "Note: <contents of note>".
 */
function extractNote(value: string): { cleanedValue: string; note: string | null } {
  const noteMatch = value.match(/Note:\s*(.+)$/);
  const note = noteMatch ? noteMatch[1].trim() : null;
  const cleanedValue = value.replace(/Note:\s*.+$/, '').trim();
  return { cleanedValue, note };
}

interface TableRow {
  ecsField: string | null;
  type: string | null;
  otelField: string | null;
  stability: string | null;
  note?: string;
}

/**
 * Parses a markdown table and converts it into an array of objects with specific property names.
 * Filters out rows that don't have values for `type`, `otelField`, or `stability`.
 */
function parseMarkdownTable(markdown: string): TableRow[] {
  const lines = markdown.split('\n');
  const tableStart = lines.findIndex((line) => line.trim().startsWith('|'));
  if (tableStart === -1) {
    throw new Error('No table found in the markdown content.');
  }

  const propertyNames = ['ecsField', 'type', 'otelField', 'stability'] as const;

  // const headers = lines[tableStart]
  //   .split('|')
  //   .map((header) => normalizeValue(header.trim()))
  //   .filter((header) => header);

  const rows = lines
    .slice(tableStart + 2)
    .filter((line) => line.trim().startsWith('|'))
    .map((line) => {
      const values = line
        .split('|')
        .map((value) => normalizeValue(value.trim()))
        .filter((value) => value);

      return propertyNames.reduce((row, propertyName, index) => {
        if (propertyName === 'otelField') {
          const { cleanedValue, note } = extractNote(values[index] || '');
          row[propertyName] = cleanedValue;
          if (note) {
            row.note = note;
          }
        } else {
          row[propertyName] = values[index] || null;
        }
        return row;
      }, {} as TableRow);
    })
    .filter((row) => row.type && row.otelField && row.stability);

  return rows;
}

const filePath = path.join(__dirname, 'ecs-otel-alignment-details.md');
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading the file:', err);
    return;
  }

  try {
    const tableData = parseMarkdownTable(data);

    const MATCH_FIELDS: string[] = tableData
      .filter((row) => row.type === 'match')
      .map((row) => row.ecsField!);

    const EQUIVALENT_FIELDS: Record<string, string> = tableData
      .filter((row) => row.type === 'equivalent')
      .reduce((obj, row) => {
        if (!obj[row.ecsField!]) {
          obj[row.ecsField!] = row.otelField!;
        }
        return obj;
      }, {} as Record<string, string>);

    const OTLP_FIELDS: Record<string, string> = tableData
      .filter((row) => row.type === 'otlp')
      .reduce((obj, row) => {
        if (!obj[row.ecsField!]) {
          obj[row.ecsField!] = row.otelField!;
        }
        return obj;
      }, {} as Record<string, string>);

    const CONFLICT_FIELDS: string[] = tableData
      .filter((row) => {
        return (
          row.type === 'conflict' &&
          !MATCH_FIELDS.includes(row.ecsField!) &&
          !EQUIVALENT_FIELDS[row.ecsField!]
        );
      })
      .map((row) => row.ecsField!);

    console.log(`
/**
 * The name of the ECS field is identical to the SemConv attribute name and has (practically) the same semantics.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const MATCH_FIELDS: string[] = ${JSON.stringify(MATCH_FIELDS)};

/**
 * The ECS field name is the same as an OTel SemConv namespace or an attribute that has significantly different semantics.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const CONFLICT_FIELDS: string[] = ${JSON.stringify(CONFLICT_FIELDS)};

/**
 * The ECS field name is different but has the same semantics as the corresponding SemConv attribute.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const EQUIVALENT_FIELDS: Record<string, string> = ${JSON.stringify(EQUIVALENT_FIELDS)};

/**
 * The ECS field has a corresponding representation in OpenTelemetry’s protocol definition.
 *
 * See https://www.elastic.co/docs/reference/ecs/ecs-otel-alignment-details for full reference.
 */
const OTLP_FIELDS: Record<string, string> = ${JSON.stringify(OTLP_FIELDS)};
`);
  } catch (error) {
    console.error('Error parsing the markdown table:', error.message);
  }
});
