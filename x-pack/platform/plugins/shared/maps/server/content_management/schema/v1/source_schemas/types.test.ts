/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KeysOfUnion } from 'type-fest';
import type {
  ESQLSourceDescriptor,
  ESSearchSourceDescriptor,
  DiscriminatedSourceDescriptor,
  SourceDescriptor,
} from './types';

/*
 * These are type-level tests. Jest does not type check, so the assertions are enforced by
 * `node scripts/type_check`. A type that does not match its annotation fails the type check.
 */
describe('DiscriminatedSourceDescriptor', () => {
  test('should exclude the loose catch-all member of SourceDescriptor', () => {
    // SourceDescriptor includes `{ type: string; [k: string]: unknown }`, which widens keyof to string.
    const sourceDescriptorIsWide: string extends KeysOfUnion<SourceDescriptor> ? true : false =
      true;
    const knownIsWide: string extends KeysOfUnion<DiscriminatedSourceDescriptor> ? true : false =
      false;
    expect([sourceDescriptorIsWide, knownIsWide]).toEqual([true, false]);
  });

  test('should include the concrete source descriptors', () => {
    const isNever: [DiscriminatedSourceDescriptor] extends [never] ? true : false = false;
    const includesEsql: ESQLSourceDescriptor extends DiscriminatedSourceDescriptor ? true : false =
      true;
    const includesEsSearch: ESSearchSourceDescriptor extends DiscriminatedSourceDescriptor
      ? true
      : false = true;
    expect([isNever, includesEsql, includesEsSearch]).toEqual([false, true, true]);
  });

  test('should expose property names from any member', () => {
    const esqlProp: KeysOfUnion<DiscriminatedSourceDescriptor> = 'esql';
    const esSearchProp: KeysOfUnion<DiscriminatedSourceDescriptor> = 'tooltipProperties';
    expect([esqlProp, esSearchProp]).toEqual(['esql', 'tooltipProperties']);
  });
});
