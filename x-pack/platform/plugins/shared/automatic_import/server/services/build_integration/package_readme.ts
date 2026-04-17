/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IntegrationAttributes, DataStreamAttributes } from '../saved_objects/schemas/types';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';

const escapeMarkdownTableCell = (value: string): string =>
  value
    .replaceAll('|', '\\|')
    .replace(/\r\n|\r|\n/g, ' ')
    .trim();

const buildExportedFieldsTable = (fieldMappings: FieldMappingEntry[]): string => {
  if (fieldMappings.length === 0) {
    return '';
  }

  const sorted = [...fieldMappings].sort((a, b) => a.name.localeCompare(b.name));
  const header = '| Field | Type |';
  const separator = '|-------|------|';
  const rows = sorted.map(
    (entry) => `| ${escapeMarkdownTableCell(entry.name)} | ${escapeMarkdownTableCell(entry.type)} |`
  );

  const tableBody = [header, separator, ...rows].join('\n');

  return [
    '<details>',
    '<summary>Exported fields</summary>',
    '',
    tableBody,
    '',
    '</details>',
    '',
  ].join('\n');
};

const buildDataStreamSection = (
  dataStream: DataStreamAttributes,
  fieldMappings: FieldMappingEntry[]
): string => {
  const lines: string[] = [];

  lines.push(`## ${dataStream.title}`, '');
  if (dataStream.description.trim().length > 0) {
    lines.push(dataStream.description, '');
  }

  const pipelineDocs = dataStream.result?.pipeline_docs as
    | Array<Record<string, unknown>>
    | undefined;
  const firstDoc = pipelineDocs?.[0];
  if (firstDoc !== undefined && Object.keys(firstDoc).length > 0) {
    lines.push(
      `An example event for \`${dataStream.data_stream_id}\` looks as following:`,
      '',
      '```json',
      JSON.stringify(firstDoc, null, 2),
      '```',
      ''
    );
  }

  const table = buildExportedFieldsTable(fieldMappings);
  if (table.length > 0) {
    lines.push(table);
  }

  return lines.join('\n');
};

export const buildReadme = (
  integration: IntegrationAttributes,
  dataStreams: DataStreamAttributes[],
  fieldMappingsPerStream: ReadonlyMap<string, FieldMappingEntry[]>
): string => {
  const integrationTitle = integration.metadata?.title ?? integration.integration_id;
  const integrationDescription = integration.metadata?.description ?? '';

  const headerLines: string[] = [`# ${integrationTitle}`, ''];
  if (integrationDescription.trim().length > 0) {
    headerLines.push(integrationDescription, '');
  }

  const dataStreamSections: string[] = [];
  for (const dataStream of dataStreams) {
    const fieldMappings = fieldMappingsPerStream.get(dataStream.data_stream_id) ?? [];
    dataStreamSections.push(buildDataStreamSection(dataStream, fieldMappings));
  }

  return `${[...headerLines, ...dataStreamSections].join('\n').trimEnd()}\n`;
};
