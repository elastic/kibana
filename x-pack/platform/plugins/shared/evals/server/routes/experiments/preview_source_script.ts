/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH } from '@kbn/evals-common';

// Inline Painless to emit compact JSON from _source to support previewing large task input/output payloads.
// A failure returns null so one bad document does not fail the score search that carries this agg.
export const PREVIEW_SOURCE_SCRIPT = `
// Append a quoted string. Char codes avoid painless escaping of \\, ", and newlines.
// Stops once out passes max so oversized strings are never walked in full.
void escape(StringBuilder out, String s, int max) {
  out.append('"');
  char bs = (char) 92;
  String hex = "0123456789abcdef";
  for (int i = 0; i < s.length() && out.length() <= max; i++) {
    char c = s.charAt(i);
    int code = (int) c;
    if (c == bs || c == (char) 34) { out.append(bs); out.append(c); }
    else if (c == (char) 8) { out.append(bs); out.append('b'); }
    else if (c == (char) 9) { out.append(bs); out.append('t'); }
    else if (c == (char) 10) { out.append(bs); out.append('n'); }
    else if (c == (char) 12) { out.append(bs); out.append('f'); }
    else if (c == (char) 13) { out.append(bs); out.append('r'); }
    else if (code < 32) {
      // Other control characters as \\u00XX so the preview stays valid JSON.
      out.append(bs);
      out.append('u');
      out.append('0');
      out.append('0');
      out.append(hex.charAt(code / 16));
      out.append(hex.charAt(code % 16));
    } else {
      out.append(c);
    }
  }
  out.append('"');
}
// Compact JSON. example.input and task.output are enabled:false, so they only exist on _source as maps and lists.
// Every branch bails once out passes max, bounding work and allocation by the preview size rather than the payload size.
void dump(StringBuilder out, def value, int max) {
  if (out.length() > max) return;
  if (value == null) { out.append("null"); return; }
  if (value instanceof String) { escape(out, (String) value, max); return; }
  if (value instanceof Number || value instanceof Boolean) { out.append(value.toString()); return; }
  if (value instanceof Map) {
    out.append('{');
    boolean first = true;
    for (def entry : ((Map) value).entrySet()) {
      if (out.length() > max) return;
      if (!first) out.append(',');
      first = false;
      escape(out, entry.getKey().toString(), max);
      out.append(':');
      dump(out, entry.getValue(), max);
    }
    out.append('}');
    return;
  }
  if (value instanceof List) {
    out.append('[');
    boolean first = true;
    for (def item : (List) value) {
      if (out.length() > max) return;
      if (!first) out.append(',');
      first = false;
      dump(out, item, max);
    }
    out.append(']');
    return;
  }
  escape(out, value.toString(), max);
}
try {
  // params.root/field select example.input or task.output.
  def root = params._source[params.root];
  if (root == null) return null;
  def value = root[params.field];
  if (value == null) return null;
  int max = (int) params.max;
  StringBuilder out = new StringBuilder();
  dump(out, value, max);
  boolean truncated = out.length() > max;
  Map result = new HashMap();
  result.put("content", truncated ? out.substring(0, max) : out.toString());
  result.put("truncated", truncated);
  return result;
} catch (Exception e) {
  // This agg shares the score search; a throw here would drop the whole table.
  return null;
}
`;

// An execution can hold several experiments with the same example and repetition, so the preview and the
// full-payload lookup share this order to always read the same document.
export const EXAMPLE_REPETITION_PAYLOAD_SORT: SortCombinations[] = [
  { '@timestamp': { order: 'desc' } },
  { experiment_id: { order: 'asc' } },
];

export const previewScriptField = (root: 'example' | 'task', field: 'input' | 'output') => ({
  script: {
    lang: 'painless' as const,
    source: PREVIEW_SOURCE_SCRIPT,
    params: { root, field, max: EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH },
  },
});
