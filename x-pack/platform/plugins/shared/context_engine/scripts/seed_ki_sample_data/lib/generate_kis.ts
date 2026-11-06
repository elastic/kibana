/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';

export interface KnowledgeIndicatorDocument {
  '@timestamp'?: string;
  type: string;
  title: string;
  description: string;
  content: string;
  tags: string[];
  attributes: Record<string, string | number | boolean>;
  references: Array<{ uri: string }>;
}

const NAMED_KI_TYPES = ['index_metadata', 'document', 'detection'] as const;

const TAG_POOL = [
  'security',
  'observability',
  'endpoint',
  'cloud',
  'authentication',
  'network',
  'compliance',
  'incident-response',
  'kubernetes',
  'database',
];

const INDEX_NAMES = [
  'logs-endpoint.events.process-*',
  'logs-cloud.aws-*',
  'logs-system.auth-*',
  'metrics-kubernetes.*',
  'logs-fleet.agent-*',
  'logs-o365.audit-*',
];

const DETECTION_QUERIES = [
  'FROM logs-endpoint.events.process-* | WHERE event.action == "process_started" AND process.name == "powershell.exe" | LIMIT 50',
  'FROM logs-system.auth-* | WHERE event.outcome == "failure" AND user.name IS NOT NULL | STATS failure_count = COUNT(*) BY user.name | WHERE failure_count > 10',
  'FROM logs-cloud.aws-* | WHERE event.action == "ConsoleLogin" AND source.ip IS NOT NULL | LIMIT 100',
];

function buildTypeNames(typeCount: number): string[] {
  const namedTypes = NAMED_KI_TYPES.slice(0, typeCount);
  const extraTypeCount = Math.max(0, typeCount - namedTypes.length);
  const extraTypes = Array.from(
    { length: extraTypeCount },
    (_, index) => `custom_type_${index + 1}`
  );

  return [...namedTypes, ...extraTypes];
}

function pickTags(): string[] {
  const count = faker.number.int({ min: 1, max: 4 });
  return faker.helpers.arrayElements(TAG_POOL, count);
}

function generateIndexMetadataKi(): KnowledgeIndicatorDocument {
  const indexName = faker.helpers.arrayElement(INDEX_NAMES);
  const keyFields = faker.helpers.arrayElements(
    ['@timestamp', 'event.action', 'host.name', 'user.name', 'source.ip', 'process.name'],
    { min: 2, max: 4 }
  );

  return {
    type: 'index_metadata',
    title: `${indexName} index profile`,
    description: faker.lorem.sentence({ min: 8, max: 16 }),
    content: [
      `Backing index: ${indexName}`,
      '',
      'Purpose:',
      faker.lorem.paragraph({ min: 2, max: 4 }),
      '',
      'Access patterns:',
      `  Q: Recent events from ${indexName}`,
      `  ES|QL: FROM ${indexName} | WHERE @timestamp > NOW() - 24 hours | LIMIT 25`,
      '  params: none',
      `  returns: recent documents from ${indexName}`,
      '',
      `Key fields: ${keyFields.join(', ')}`,
    ].join('\n'),
    tags: pickTags(),
    attributes: {
      key_fields: keyFields.join(', '),
      confidence: faker.number.float({ min: 0.75, max: 0.99, fractionDigits: 2 }),
      source_index: indexName,
    },
    references: [{ uri: `https://elastic.co/docs/integrations/${faker.word.noun()}` }],
  };
}

function generateDocumentKi(): KnowledgeIndicatorDocument {
  const entityType = faker.helpers.arrayElement(['user', 'host', 'service', 'case']);
  const entityId = faker.string.alphanumeric({ length: 8, casing: 'upper' });

  return {
    type: 'document',
    title: `${entityType} ${entityId} profile`,
    description: faker.lorem.sentence({ min: 6, max: 12 }),
    content: [
      `Entity type: ${entityType}`,
      `Entity id: ${entityId}`,
      '',
      faker.lorem.paragraph({ min: 2, max: 3 }),
      '',
      'Access patterns:',
      `  Q: Lookup ${entityType} ${entityId}`,
      `  ES|QL: FROM logs-* | WHERE ${entityType}.id == "${entityId}" | LIMIT 10`,
      `  params: ${entityType}_id (keyword)`,
      `  returns: recent activity for ${entityType} ${entityId}`,
    ].join('\n'),
    tags: pickTags(),
    attributes: {
      entity_type: entityType,
      entity_id: entityId,
      confidence: faker.number.float({ min: 0.7, max: 0.95, fractionDigits: 2 }),
    },
    references: [
      {
        uri: `https://kibana.local/app/discover#/?_a=(query:(language:kuery,query:'${entityType}.id:${entityId}'))`,
      },
    ],
  };
}

function generateDetectionKi(): KnowledgeIndicatorDocument {
  const query = faker.helpers.arrayElement(DETECTION_QUERIES);
  const severity = faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']);

  return {
    type: 'detection',
    title: faker.company.catchPhrase(),
    description: faker.lorem.sentence({ min: 8, max: 14 }),
    content: [
      'Detection condition:',
      query,
      '',
      'When to use:',
      faker.lorem.paragraph({ min: 1, max: 2 }),
      '',
      'Access patterns:',
      `  Q: Run this detection`,
      `  ES|QL: ${query}`,
      '  params: none',
      '  returns: matching events for this detection',
    ].join('\n'),
    tags: [...pickTags(), 'detection'],
    attributes: {
      severity,
      query_type: query.includes('STATS') ? 'stats' : 'match',
      confidence: faker.number.float({ min: 0.8, max: 0.99, fractionDigits: 2 }),
    },
    references: [
      {
        uri: `https://github.com/elastic/detection-rules/pull/${faker.number.int({
          min: 1000,
          max: 9999,
        })}`,
      },
    ],
  };
}

function generateGenericKi(typeName: string): KnowledgeIndicatorDocument {
  return {
    type: typeName,
    title: `${typeName} ${faker.company.buzzNoun()}`,
    description: faker.lorem.sentence({ min: 6, max: 12 }),
    content: [
      `Type: ${typeName}`,
      '',
      faker.lorem.paragraph({ min: 2, max: 3 }),
      '',
      'Access patterns:',
      `  Q: Query ${typeName} knowledge`,
      `  ES|QL: FROM logs-* | WHERE type == "${typeName}" | LIMIT 10`,
      '  params: none',
      `  returns: documents tagged with type ${typeName}`,
    ].join('\n'),
    tags: pickTags(),
    attributes: {
      confidence: faker.number.float({ min: 0.7, max: 0.99, fractionDigits: 2 }),
    },
    references: [{ uri: `https://elastic.co/docs/${faker.word.noun()}` }],
  };
}

function generateKiForType(typeName: string): KnowledgeIndicatorDocument {
  switch (typeName) {
    case 'index_metadata':
      return generateIndexMetadataKi();
    case 'document':
      return generateDocumentKi();
    case 'detection':
      return generateDetectionKi();
    default:
      return generateGenericKi(typeName);
  }
}

function generateKi(typeNames: string[]): KnowledgeIndicatorDocument {
  const typeName = faker.helpers.arrayElement(typeNames);
  const ki = generateKiForType(typeName);

  return {
    ...ki,
    '@timestamp': faker.date.recent({ days: 30 }).toISOString(),
  };
}

export function generateSampleKis(count: number, typeCount = 3): KnowledgeIndicatorDocument[] {
  faker.seed(20260803);
  const typeNames = buildTypeNames(typeCount);

  return Array.from({ length: count }, () => generateKi(typeNames));
}
