/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizePanelVegaSpec } from './sanitize_panel_vega_spec';

describe('sanitizePanelVegaSpec', () => {
  it('accepts a valid Vega JSON object string', () => {
    const result = sanitizePanelVegaSpec(
      JSON.stringify({
        $schema: 'https://vega.github.io/schema/vega/v5.json',
        marks: [{ type: 'text', encode: { update: { x: { signal: "scale('x', 1)" } } } }],
      })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.spec).marks[0].encode.update.x.signal).toBe("scale('x', 1)");
    }
  });

  it('heals one layer of double-encoded JSON and rewrites Scale(', () => {
    const inner = JSON.stringify(
      {
        marks: [
          {
            type: 'text',
            encode: {
              update: {
                x: { signal: "Scale('x', datum.stack) + Bandwidth('x')" },
              },
            },
          },
        ],
      },
      null,
      2
    );
    // Simulate the agent packing JSON.stringify(alreadySerializedSpec) into the field.
    const doubleEncoded = JSON.stringify(inner).slice(1, -1);

    const result = sanitizePanelVegaSpec(doubleEncoded);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.parse(result.spec).marks[0].encode.update.x.signal).toBe(
        "scale('x', datum.stack) + bandwidth('x')"
      );
    }
  });

  it('rejects non-JSON specs that cannot be healed', () => {
    const result = sanitizePanelVegaSpec('not-json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('verbatim');
    }
  });

  it('rejects JSON arrays', () => {
    const result = sanitizePanelVegaSpec('[1,2]');
    expect(result.ok).toBe(false);
  });
});
