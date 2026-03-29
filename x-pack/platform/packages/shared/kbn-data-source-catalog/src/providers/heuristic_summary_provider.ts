/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataSourceEntry, DataSourceSemantic } from '../types';

/**
 * Generates heuristic summaries for data sources based on field names,
 * integration metadata, and ECS coverage. No LLM required — this is a
 * fallback/bootstrap mechanism until the elasticsearch-index-summarizer ships.
 */
export function generateHeuristicSummary(entry: DataSourceEntry): DataSourceSemantic {
  const summary = buildSummary(entry);
  const topics = inferTopics(entry);
  const mitreTechniques = inferMitreTechniques(entry);

  return {
    summary,
    topics,
    mitre_techniques: mitreTechniques,
  };
}

function buildSummary(entry: DataSourceEntry): string {
  const parts: string[] = [];

  if (entry.integration) {
    parts.push(`${entry.integration.package_title} integration: ${entry.integration.description}`);
    parts.push(
      `Data stream: ${entry.integration.data_stream_title} (${entry.integration.dataset})`
    );
  } else {
    parts.push(
      `${entry.type === 'data_stream' ? 'Data stream' : entry.type === 'alias' ? 'Alias' : 'Index'}: ${entry.name}`
    );
  }

  if (entry.mapping.total_field_count > 0) {
    parts.push(
      `Contains ${entry.mapping.total_field_count} fields (${entry.mapping.ecs_field_count} ECS, ${Math.round(entry.mapping.ecs_field_coverage * 100)}% coverage)`
    );
  }

  if (entry.stats) {
    if (entry.stats.doc_count > 0) {
      parts.push(
        `${entry.stats.doc_count.toLocaleString()} documents, ${entry.stats.freshness_category} data`
      );
    } else {
      parts.push(`No documents currently indexed`);
    }
  }

  const topFields = entry.mapping.fields
    .filter((f) => f.ecs)
    .slice(0, 15)
    .map((f) => f.name);
  if (topFields.length > 0) {
    parts.push(`Key ECS fields: ${topFields.join(', ')}`);
  }

  return parts.join('. ');
}

function inferTopics(entry: DataSourceEntry): string[] {
  const topics: Set<string> = new Set();
  const name = entry.name.toLowerCase();
  const fieldNames = entry.mapping.fields.map((f) => f.name.toLowerCase());

  // Infer from name
  if (name.includes('process')) topics.add('process execution');
  if (name.includes('network') || name.includes('dns') || name.includes('http'))
    topics.add('network');
  if (name.includes('file')) topics.add('file activity');
  if (name.includes('auth') || name.includes('login')) topics.add('authentication');
  if (name.includes('registry')) topics.add('registry');
  if (name.includes('alert')) topics.add('security alerts');
  if (name.includes('endpoint')) topics.add('endpoint security');
  if (
    name.includes('cloud') ||
    name.includes('aws') ||
    name.includes('azure') ||
    name.includes('gcp')
  )
    topics.add('cloud');
  if (name.includes('system')) topics.add('system');

  // Infer from fields
  const allFields = fieldNames.join(' ');
  if (allFields.includes('process.')) topics.add('process execution');
  if (
    allFields.includes('network.') ||
    allFields.includes('destination.') ||
    allFields.includes('source.ip')
  )
    topics.add('network');
  if (allFields.includes('file.')) topics.add('file activity');
  if (allFields.includes('user.name') || allFields.includes('user.id')) topics.add('user activity');
  if (allFields.includes('host.')) topics.add('host');
  if (allFields.includes('threat.')) topics.add('threat intelligence');

  return Array.from(topics);
}

function inferMitreTechniques(entry: DataSourceEntry): string[] {
  const techniques: Set<string> = new Set();
  const name = entry.name.toLowerCase();
  const fieldNames = entry.mapping.fields.map((f) => f.name.toLowerCase());
  const allFields = fieldNames.join(' ');

  // Process execution → T1059 (Command and Scripting Interpreter)
  if (name.includes('process') || allFields.includes('process.command_line')) {
    techniques.add('T1059');
    techniques.add('T1106'); // Native API
  }

  // Network → T1071 (Application Layer Protocol)
  if (name.includes('network') || allFields.includes('destination.port')) {
    techniques.add('T1071');
    techniques.add('T1095'); // Non-Application Layer Protocol
  }

  // DNS → T1071.004 (DNS)
  if (name.includes('dns') || allFields.includes('dns.question')) {
    techniques.add('T1071.004');
  }

  // File activity → T1083 (File and Directory Discovery)
  if (name.includes('file') || allFields.includes('file.path')) {
    techniques.add('T1083');
  }

  // Authentication → T1078 (Valid Accounts)
  if (name.includes('auth') || allFields.includes('user.name')) {
    techniques.add('T1078');
    techniques.add('T1110'); // Brute Force
  }

  // Registry → T1112 (Modify Registry)
  if (name.includes('registry') || allFields.includes('registry.')) {
    techniques.add('T1112');
  }

  return Array.from(techniques);
}
