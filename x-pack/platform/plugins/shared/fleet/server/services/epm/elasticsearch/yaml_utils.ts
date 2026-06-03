/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToStringOptions } from 'yaml';
import { Document, visit } from 'yaml';

/**
 * Converts a plain object to a YAML string, fixing two serialization issues
 * that cause Elasticsearch's Jackson/SnakeYAML parser to reject the output:
 *
 * 1. Multi-line strings (e.g. Painless scripts) are forced to literal block
 *    scalars (`source: |`). Without this, the yaml package may choose folded
 *    block scalars (`source: >`) for long lines.
 *
 * 2. Characters U+007F–U+009F are not escaped by the yaml package in
 *    double-quoted scalars, but SnakeYAML rejects them as raw bytes. They are
 *    replaced with their `\xNN` YAML escape sequences in the final output.
 */
export function toYaml(obj: unknown, opts?: ToStringOptions): string {
  const doc = new Document(obj);
  visit(doc, {
    Scalar(key, node) {
      if (typeof node.value === 'string' && node.value.includes('\n')) {
        node.type = 'BLOCK_LITERAL';
      }
    },
  });
  return escapeUnescapedControlChars(doc.toString(opts));
}

// The yaml package does not escape U+007F (DEL) or U+0080–U+009F in
// double-quoted scalars. SnakeYAML rejects these raw bytes with
// "special characters are not allowed". Replace them with \xNN sequences.
function escapeUnescapedControlChars(yaml: string): string {
  return yaml.replace(
    /[\x7f-\x9f]/g,
    (c) => `\\x${c.codePointAt(0)!.toString(16).padStart(2, '0')}`
  );
}
