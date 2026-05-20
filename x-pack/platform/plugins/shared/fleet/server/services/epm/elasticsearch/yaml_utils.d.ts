import type { ToStringOptions } from 'yaml';
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
export declare function toYaml(obj: unknown, opts?: ToStringOptions): string;
