/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transpile } from '..';
import type { StreamlangDSL } from '../../../../types/streamlang';

/**
 * The `uri_parts` ingest-pipeline output is produced by the generic
 * field-rename machinery (see `pre_processing.ts`) rather than a bespoke
 * converter, so these tests drive the full transpile path and assert on the
 * emitted `IngestProcessorContainer[]`.
 */
async function transpileSingle(step: Record<string, unknown>) {
  const dsl: StreamlangDSL = {
    steps: [step as unknown as StreamlangDSL['steps'][number]],
  };
  const result = await transpile(dsl);
  return result.processors;
}

describe('transpile uri_parts -> ingest pipeline', () => {
  describe('defaults', () => {
    it('emits a bare `uri_parts` processor using the `from` -> `field` rename', async () => {
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'attributes.request_url',
      });
      expect(processors).toEqual([
        {
          uri_parts: {
            field: 'attributes.request_url',
          },
        },
      ]);
    });

    it('renames `to` -> `target_field`', async () => {
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'attributes.href',
        to: 'attributes.parsed',
      });
      expect(processors).toEqual([
        {
          uri_parts: {
            field: 'attributes.href',
            target_field: 'attributes.parsed',
          },
        },
      ]);
    });

    it('accepts `to === from` (canonical ECS in-place shape)', async () => {
      // Both `from` and the ingest-processor `target_field` default to "url";
      // the ECS canonical shape parses the `url` scalar into `url.*` in place.
      // The schema intentionally does not reject this — the processor is
      // emitted with identical `field`/`target_field` and ES handles it.
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'url',
        to: 'url',
      });
      expect(processors).toEqual([
        {
          uri_parts: {
            field: 'url',
            target_field: 'url',
          },
        },
      ]);
    });
  });

  describe('pass-through options', () => {
    it('forwards keep_original, remove_if_successful, ignore_missing, and ignore_failure untouched', async () => {
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'u',
        to: 'url',
        keep_original: false,
        remove_if_successful: true,
        ignore_missing: true,
        ignore_failure: true,
      });
      expect(processors).toEqual([
        {
          uri_parts: {
            field: 'u',
            target_field: 'url',
            keep_original: false,
            remove_if_successful: true,
            ignore_missing: true,
            ignore_failure: true,
          },
        },
      ]);
    });
  });

  describe('where conditions', () => {
    it('renames `where` to `if` and produces a painless guard', async () => {
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'url',
        where: { field: 'attributes.enabled', eq: true },
      });

      expect(processors).toHaveLength(1);
      const [processor] = processors;
      expect(processor).toHaveProperty('uri_parts');
      const uriParts = (processor as unknown as { uri_parts: Record<string, unknown> }).uri_parts;

      expect(uriParts.field).toBe('url');
      expect(uriParts).not.toHaveProperty('where');
      expect(typeof uriParts.if).toBe('string');
      // Sanity: painless guard references the where field
      expect(uriParts.if).toContain('attributes.enabled');
    });

    it('combines ignore_missing with where by delegating to the ingest processor (no surrogate guard)', async () => {
      // Parity note: the ingest `uri_parts` processor implements
      // `ignore_missing` natively — unlike the ES|QL transpiler we do NOT
      // inject an extra `WHERE NOT(from IS NULL)` guard here. That ownership
      // split is the reason the ES|QL transpiler carries one explicitly.
      const processors = await transpileSingle({
        action: 'uri_parts',
        from: 'url',
        ignore_missing: true,
        where: { field: 'attributes.enabled', eq: true },
      });
      expect(processors).toHaveLength(1);
      const uriParts = (processors[0] as unknown as { uri_parts: Record<string, unknown> })
        .uri_parts;
      expect(uriParts.ignore_missing).toBe(true);
      expect(typeof uriParts.if).toBe('string');
    });
  });
});
