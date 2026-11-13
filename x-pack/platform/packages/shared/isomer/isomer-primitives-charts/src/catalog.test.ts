/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartDefinitions } from './registry';

const USE = /; use (\w+)\.$/;

const byType = new Map(chartDefinitions.map(({ type, catalog }) => [type as string, catalog]));

describe('catalog boundaries', () => {
  it.each(chartDefinitions.map(({ type, catalog }) => ({ type, catalog })))(
    '$type sends a reader elsewhere in the words the other type uses for itself',
    ({ catalog }) => {
      for (const line of catalog.avoidWhen) {
        const [, target] = USE.exec(line) ?? [];
        if (target === undefined) {
          continue;
        }
        const other = byType.get(target);
        expect({ line, registered: other !== undefined }).toEqual({
          line,
          registered: true,
        });
        expect(line).toBe(`${other!.useWhen[0]!.slice(0, -1)}; use ${target}.`);
      }
    }
  );

  it('states each type’s own case first, as one sentence', () => {
    for (const { catalog } of chartDefinitions) {
      expect(catalog.useWhen[0]).toMatch(/^[A-Z].*\.$/);
    }
  });
});
