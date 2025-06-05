/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keepFields, aliases } from '@kbn/streams-schema/src/helpers/namespaced_ecs';

// Will match %{SYNTAX}, %{SYNTAX:SEMANTIC}, %{SYNTAX:SEMANTIC:TYPE}, and support special characters and dots.
export const SUBPATTERNS_REGEX =
  /%\{([A-Z0-9_@#$%&*+=\-\.]+)(?::([A-Za-z0-9_@#$%&*+=\-\.]+))?(?::([A-Za-z]+))?\}/g;

export function convertEcsFieldsToOtel(pattern: string): string {
  const invertedAliases = Object.fromEntries(Object.entries(aliases).map(([k, v]) => [v, k]));

  // Convert ECS fields to OpenTelemetry semantic convention
  return pattern.replace(SUBPATTERNS_REGEX, (match, syntax, semantic, type) => {
    if (!semantic) {
      return match; // No semantic, return as is
    }
    if (keepFields.includes(semantic)) {
      return match;
    }
    if (invertedAliases[semantic]) {
      return `%{${syntax}:${invertedAliases[semantic]}}`;
    }
    return `%{${syntax}:attributes.${semantic.replace('.', '_')}}`; // Extract unknown fields to custom attribute
  });
}
