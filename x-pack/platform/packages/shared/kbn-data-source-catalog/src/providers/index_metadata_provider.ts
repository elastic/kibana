/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { ecsFieldMap } from '@kbn/alerts-as-data-utils';
import { DEFAULT_FIELD_LIMIT, CATALOG_VERSION } from '../constants';
import type { DataSourceEntry, DataSourceType, FieldMetadata } from '../types';
import { globToRegex } from '../utils';

interface ResolvedDataSource {
  name: string;
  type: DataSourceType;
}

interface TemplateEntry {
  name: string;
  patterns: string[];
  meta?: Record<string, unknown>;
}

export async function discoverIndexMetadata(
  esClient: ElasticsearchClient,
  patterns: string[]
): Promise<DataSourceEntry[]> {
  const resolved = await esClient.indices.resolveIndex({
    name: patterns.join(','),
    expand_wildcards: 'open',
  });

  const dataSources: ResolvedDataSource[] = [
    ...resolved.indices.map((idx) => ({ name: idx.name, type: 'index' as const })),
    ...resolved.data_streams.map((ds) => ({ name: ds.name, type: 'data_stream' as const })),
    ...resolved.aliases.map((al) => ({ name: al.name, type: 'alias' as const })),
  ];

  if (dataSources.length === 0) {
    return [];
  }

  const names = dataSources.map((ds) => ds.name);
  const [mappingsResult, templatesResult] = await Promise.all([
    esClient.indices.getMapping({ index: names.join(','), ignore_unavailable: true }),
    esClient.indices.getIndexTemplate({ name: '*' }).catch(() => ({ index_templates: [] })),
  ]);

  const templateMap = buildTemplateMap(
    templatesResult.index_templates as Array<{ name: string; index_template: { index_patterns?: string[]; template?: { mappings?: { _meta?: Record<string, unknown> } } } }>
  );
  const now = new Date().toISOString();

  return dataSources.map((ds) => {
    const mapping = mappingsResult[ds.name]?.mappings ?? {};
    const fields = flattenProperties(mapping.properties ?? {});
    const ecsFields = fields.filter((f) => f.ecs);
    const limitedFields = prioritizeFields(fields, DEFAULT_FIELD_LIMIT);
    const matchedTemplate = findMatchingTemplate(ds.name, templateMap);

    return {
      id: `${ds.type}::${ds.name}`,
      name: ds.name,
      type: ds.type,
      mapping: {
        fields: limitedFields,
        total_field_count: fields.length,
        ecs_field_count: ecsFields.length,
        ecs_field_coverage: fields.length > 0 ? ecsFields.length / fields.length : 0,
      },
      template: matchedTemplate,
      catalog_version: CATALOG_VERSION,
      refreshed_at: now,
    };
  });
}

function flattenProperties(
  properties: Record<string, MappingProperty>,
  prefix = ''
): FieldMetadata[] {
  const fields: FieldMetadata[] = [];

  for (const [key, value] of Object.entries(properties)) {
    const fullName = prefix ? `${prefix}.${key}` : key;

    if ('properties' in value && value.properties) {
      fields.push(
        ...flattenProperties(value.properties as Record<string, MappingProperty>, fullName)
      );
    } else {
      const fieldType = ('type' in value ? value.type : 'object') as string;
      const ecsEntry = (ecsFieldMap as Record<string, { type?: string }>)[fullName];
      fields.push({
        name: fullName,
        type: fieldType,
        ecs: ecsEntry?.type === fieldType,
        searchable: fieldType !== 'object' && fieldType !== 'nested',
        aggregatable: [
          'keyword',
          'long',
          'integer',
          'date',
          'boolean',
          'ip',
          'float',
          'double',
          'short',
          'byte',
        ].includes(fieldType),
      });
    }
  }

  return fields;
}

function prioritizeFields(fields: FieldMetadata[], limit: number): FieldMetadata[] {
  if (fields.length <= limit) {
    return fields;
  }
  const ecsFields = fields.filter((f) => f.ecs);
  const nonEcsFields = fields.filter((f) => !f.ecs);
  const remaining = limit - ecsFields.length;
  return [...ecsFields, ...nonEcsFields.slice(0, Math.max(0, remaining))];
}

function buildTemplateMap(
  templates: Array<{ name: string; index_template: { index_patterns?: string[]; template?: { mappings?: { _meta?: Record<string, unknown> } } } }>
): TemplateEntry[] {
  return templates.map((t) => ({
    name: t.name,
    patterns: t.index_template.index_patterns ?? [],
    meta: t.index_template.template?.mappings?._meta,
  }));
}

function findMatchingTemplate(
  indexName: string,
  templates: TemplateEntry[]
): { name: string; meta?: Record<string, unknown> } | undefined {
  for (const t of templates) {
    for (const pattern of t.patterns) {
      const regex = globToRegex(pattern);
      if (regex.test(indexName)) {
        return { name: t.name, meta: t.meta };
      }
    }
  }
  return undefined;
}
