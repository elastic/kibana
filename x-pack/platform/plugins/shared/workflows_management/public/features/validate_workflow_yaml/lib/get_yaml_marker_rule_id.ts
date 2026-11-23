/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type YamlMarkerRuleId = 'schemaViolation' | 'yamlSyntaxError';

/** Maps Monaco YAML marker provenance to the semantic rule that produced it. */
export const getYamlMarkerRuleId = (source?: string): YamlMarkerRuleId =>
  source?.startsWith('yaml-schema:') ? 'schemaViolation' : 'yamlSyntaxError';
