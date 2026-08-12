/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SampleDocument } from '../shared/record_types';
import { namespacePrefixes, aliases as otelFieldAliases } from './namespaced_ecs';

// Reverse map: ECS alias name → OTel source field name.
// e.g. 'message' → 'body.text', 'trace.id' → 'trace_id'
const REVERSE_ALIAS_MAP = new Map(
  Object.entries(otelFieldAliases).map(([otelField, ecsAlias]) => [ecsAlias, otelField])
);

/**
 * OTel passthrough objects and explicit aliases produce duplicate columns
 * in ES|QL results. Strip them so draft samples match what the Search API
 * returns for non-draft streams.
 *
 * Two categories are removed:
 * 1. Passthrough aliases — e.g. `host.name` when `attributes.host.name` exists
 * 2. Explicit OTel aliases — e.g. `message` only when `body.text` also exists
 *
 * Both checks are conditional: the alias is only stripped when the
 * corresponding source field is present in the document. This avoids
 * incorrectly removing real fields from non-OTel streams (e.g. `message`
 * in ECS data where `body.text` doesn't exist).
 */
export function stripOtelAliases(docs: SampleDocument[]): SampleDocument[] {
  return docs.map((doc) => {
    const keys = Object.keys(doc);
    const keySet = new Set(keys);
    const namespacedFields = new Set(
      keys.filter((k) => namespacePrefixes.some((p) => k.startsWith(p)))
    );

    const aliasKeys = new Set<string>();

    for (const k of keys) {
      if (namespacePrefixes.some((p) => k.startsWith(p))) continue;
      if (namespacePrefixes.some((p) => namespacedFields.has(`${p}${k}`))) {
        aliasKeys.add(k);
      }
    }

    for (const k of keys) {
      const otelSource = REVERSE_ALIAS_MAP.get(k);
      if (otelSource && keySet.has(otelSource)) {
        aliasKeys.add(k);
      }
    }

    if (aliasKeys.size === 0) return doc;

    const cleaned: SampleDocument = {};
    for (const [key, value] of Object.entries(doc)) {
      if (!aliasKeys.has(key)) {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });
}
