/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MAX_AI_INDEX_QUERY_TEMPLATES,
  MAX_AI_INDEX_QUERY_TEMPLATES_BYTES,
  MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH,
} from '../../common/constants';
import type {
  AiIndexField,
  AiIndexQueryTemplate,
  QueryAiIndicesResponse,
} from '../../common/http_api/ai_indices';
import { ESQL_ATTRIBUTE_KEY } from '../ki_verification/verifiers/esql_attribute';
import { quoteIdentifier, quoteStringLiteral } from './esql_quote';
import { findUsableField } from './field_types';
import { executeScopedEsql } from './query';

export const KI_ATTRIBUTES_FIELD = 'attributes';
const TIMESTAMP_FIELD = '@timestamp';
const ESQL_COLUMN = 'esql';
const OPTIONAL_COLUMNS = ['title', 'description'] as const;

export interface AiIndexQueryTemplatesDescription {
  query_templates: AiIndexQueryTemplate[];
  truncated: boolean;
}

export interface DescribeAiIndexQueryTemplatesParams {
  esClient: ElasticsearchClient;
  target: string;
  spaceId: string;
  fields: AiIndexField[];
}

/** `_id` is always sortable through `METADATA`, which `_search` cannot offer. */
const buildTemplatesQuery = (target: string, fields: AiIndexField[]): string => {
  const present = OPTIONAL_COLUMNS.filter((path) => findUsableField(fields, path));
  const newestFirst = findUsableField(fields, TIMESTAMP_FIELD, 'date')
    ? [`${quoteIdentifier(TIMESTAMP_FIELD)} DESC NULLS LAST`]
    : [];
  return [
    `FROM ${target} METADATA _id`,
    `| EVAL ${ESQL_COLUMN} = FIELD_EXTRACT(${quoteIdentifier(
      KI_ATTRIBUTES_FIELD
    )}, ${quoteStringLiteral(ESQL_ATTRIBUTE_KEY)})`,
    `| WHERE ${ESQL_COLUMN} IS NOT NULL`,
    `| MV_EXPAND ${ESQL_COLUMN}`,
    `| SORT ${[...newestFirst, '_id ASC', `${ESQL_COLUMN} ASC`].join(', ')}`,
    `| KEEP ${['_id', ...present.map(quoteIdentifier), ESQL_COLUMN].join(', ')}`,
  ].join('\n');
};

const toTemplates = ({ columns, values }: QueryAiIndicesResponse) => {
  const column = (name: string) => columns.findIndex((candidate) => candidate.name === name);
  const [idAt, titleAt, descriptionAt, esqlAt] = ['_id', ...OPTIONAL_COLUMNS, ESQL_COLUMN].map(
    column
  );
  const text = (row: unknown[], at: number): string | undefined => {
    const value = at >= 0 ? row[at] : undefined;
    return typeof value === 'string' ? value : undefined;
  };

  let clipped = false;
  const templates = values.flatMap((row): AiIndexQueryTemplate[] => {
    const id = text(row, idAt);
    const esql = text(row, esqlAt);
    if (id === undefined || esql === undefined || esql.length === 0) {
      return [];
    }
    clipped ||= esql.length > MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH;
    const description = text(row, descriptionAt);
    return [
      {
        ki_id: id,
        title: text(row, titleAt) ?? id,
        ...(description !== undefined && { description }),
        esql: esql.slice(0, MAX_AI_INDEX_QUERY_TEMPLATE_ESQL_LENGTH),
      },
    ];
  });
  return { templates, clipped };
};

/** Serialized-array bytes: `[`, `]`, and a comma between entries. */
const takeWithinBytes = (templates: AiIndexQueryTemplate[]) => {
  const kept: AiIndexQueryTemplate[] = [];
  let bytes = 2;
  for (const template of templates) {
    bytes += Buffer.byteLength(JSON.stringify(template)) + (kept.length > 0 ? 1 : 0);
    if (bytes > MAX_AI_INDEX_QUERY_TEMPLATES_BYTES) {
      break;
    }
    kept.push(template);
  }
  return kept;
};

/**
 * Space-visible KIs carrying `attributes.esql`, one template per query string, newest first when
 * `@timestamp` is mapped, then by `_id`. Empty unless `attributes` is `flattened`. Shard failures
 * error out rather than return a partial list.
 */
export const describeAiIndexQueryTemplates = async ({
  esClient,
  target,
  spaceId,
  fields,
}: DescribeAiIndexQueryTemplatesParams): Promise<AiIndexQueryTemplatesDescription> => {
  if (!findUsableField(fields, KI_ATTRIBUTES_FIELD, 'flattened')) {
    return { query_templates: [], truncated: false };
  }

  const response = await executeScopedEsql({
    esClient,
    spaceId,
    query: buildTemplatesQuery(target, fields),
    limit: MAX_AI_INDEX_QUERY_TEMPLATES + 1,
    allowPartialResults: false,
  });
  const { templates, clipped } = toTemplates(response);
  const kept = takeWithinBytes(templates.slice(0, MAX_AI_INDEX_QUERY_TEMPLATES));
  return {
    query_templates: kept,
    truncated: clipped || kept.length < templates.length,
  };
};
