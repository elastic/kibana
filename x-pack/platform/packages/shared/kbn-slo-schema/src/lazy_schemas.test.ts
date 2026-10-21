/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isZod } from '@kbn/zod/v4';
import * as packageExports from '..';

/**
 * Every zod schema of the package is wrapped in `lazySchema`, so importing the package must
 * not build any schema: they are built on first use and can be garbage collected afterwards.
 */
describe('@kbn/slo-schema lazy zod schemas', () => {
  it('does not build any zod schema when the package is imported', () => {
    const mockZodCalls: string[] = [];

    jest.isolateModules(() => {
      jest.doMock('@kbn/zod', () => {
        const actual = jest.requireActual('@kbn/zod');
        // Forwards to the real `z` namespace and records every function call made on it.
        const countingZ = new Proxy(
          {},
          {
            get: (_target, prop) => {
              const value: unknown = Reflect.get(actual.z, prop);
              if (typeof value !== 'function') {
                return value;
              }
              return (...args: unknown[]) => {
                mockZodCalls.push(String(prop));
                return Reflect.apply(value, actual.z, args);
              };
            },
          }
        );
        return { ...actual, z: countingZ };
      });

      const isolatedExports = jest.requireActual('..');

      expect(isolatedExports.createSLOParamsSchema).toBeDefined();
      expect(isolatedExports.indicatorSchemaZod).toBeDefined();
    });

    expect(mockZodCalls).toEqual([]);
  });

  it('materializes every exported zod schema without throwing', () => {
    const exportedValues: Record<string, unknown> = packageExports;
    const failures: string[] = [];
    let materialized = 0;

    for (const [name, value] of Object.entries(exportedValues)) {
      try {
        if (isZod(value) && value._zod.def !== undefined) {
          materialized++;
        }
      } catch (error) {
        failures.push(`${name}: ${String(error)}`);
      }
    }

    expect(failures).toEqual([]);
    expect(materialized).toBeGreaterThan(100);
  });
});
