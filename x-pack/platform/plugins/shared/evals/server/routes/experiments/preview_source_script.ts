/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH } from '@kbn/evals-common';

// Inline Painless to emit compact JSON from _source to support previewing large task input/output payloads.
// A failure returns null so one bad document does not fail the score search that carries this agg.
export const PREVIEW_SOURCE_SCRIPT = `
// Quote a string. Char codes avoid painless escaping of \\, ", and newlines.
String escape(String s) {
  StringBuilder sb = new StringBuilder();
  sb.append('"');
  char bs = (char) 92;
  String hex = "0123456789abcdef";
  for (int i = 0; i < s.length(); i++) {
    char c = s.charAt(i);
    int code = (int) c;
    if (c == bs || c == (char) 34) { sb.append(bs); sb.append(c); }
    else if (c == (char) 8) { sb.append(bs); sb.append('b'); }
    else if (c == (char) 9) { sb.append(bs); sb.append('t'); }
    else if (c == (char) 10) { sb.append(bs); sb.append('n'); }
    else if (c == (char) 12) { sb.append(bs); sb.append('f'); }
    else if (c == (char) 13) { sb.append(bs); sb.append('r'); }
    else if (code < 32) {
      // Other control characters as \\u00XX so the preview stays valid JSON.
      sb.append(bs);
      sb.append('u');
      sb.append('0');
      sb.append('0');
      sb.append(hex.charAt(code / 16));
      sb.append(hex.charAt(code % 16));
    } else {
      sb.append(c);
    }
  }
  sb.append('"');
  return sb.toString();
}
// Compact JSON. example.input and task.output are enabled:false, so they only exist on _source as maps and lists.
String dump(def value) {
  if (value == null) return "null";
  if (value instanceof String) return escape((String) value);
  if (value instanceof Number || value instanceof Boolean) return value.toString();
  if (value instanceof Map) {
    StringBuilder sb = new StringBuilder();
    sb.append('{');
    boolean first = true;
    for (def entry : ((Map) value).entrySet()) {
      if (!first) sb.append(',');
      first = false;
      sb.append(escape(entry.getKey().toString()));
      sb.append(':');
      sb.append(dump(entry.getValue()));
    }
    sb.append('}');
    return sb.toString();
  }
  if (value instanceof List) {
    StringBuilder sb = new StringBuilder();
    sb.append('[');
    boolean first = true;
    for (def item : (List) value) {
      if (!first) sb.append(',');
      first = false;
      sb.append(dump(item));
    }
    sb.append(']');
    return sb.toString();
  }
  return escape(value.toString());
}
try {
  // params.root/field select example.input or task.output. Slice after serializing so only the cap leaves the node.
  def root = params._source[params.root];
  if (root == null) return null;
  def value = root[params.field];
  if (value == null) return null;
  String json = dump(value);
  int max = (int) params.max;
  boolean truncated = json.length() > max;
  Map result = new HashMap();
  result.put("content", truncated ? json.substring(0, max) : json);
  result.put("truncated", truncated);
  return result;
} catch (Exception e) {
  // This agg shares the score search; a throw here would drop the whole table.
  return null;
}
`;

export const previewScriptField = (root: 'example' | 'task', field: 'input' | 'output') => ({
  script: {
    lang: 'painless' as const,
    source: PREVIEW_SOURCE_SCRIPT,
    params: { root, field, max: EXPERIMENT_EXAMPLE_PREVIEW_MAX_LENGTH },
  },
});
