/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Compile-time parity assertions between the io-ts schemas and their zod twins:
 * `z.input` must match the io-ts wire type (`t.OutputOf`) and `z.output` must
 * match the io-ts decoded type (`t.TypeOf`), so that flipping a consumer from
 * io-ts to zod cannot change any inferred type.
 *
 * "Match" is mutual assignability: io-ts builds intersections
 * (`t.intersection([t.type, t.partial])`) where zod builds a single object
 * type, which are interchangeable but not identical to a strict equality check.
 */

import type * as t from 'io-ts';
import type { z } from '@kbn/zod';
import type { dateType as ioTsDateType } from '../common';
import type { durationType as ioTsDurationType } from '../duration';
import type {
  indicatorSchema as ioTsIndicatorSchema,
  indicatorTypesArraySchema as ioTsIndicatorTypesArraySchema,
  querySchema as ioTsQuerySchema,
} from '../indicators';
import type {
  groupBySchema as ioTsGroupBySchema,
  objectiveSchema as ioTsObjectiveSchema,
  optionalSettingsSchema as ioTsOptionalSettingsSchema,
  settingsSchema as ioTsSettingsSchema,
  sloDefinitionSchema as ioTsSloDefinitionSchema,
  storedSloDefinitionSchema as ioTsStoredSloDefinitionSchema,
} from '../slo';
import type { timeWindowSchema as ioTsTimeWindowSchema } from '../time_window';
import type {
  dateType,
  durationType,
  groupBySchema,
  indicatorSchema,
  indicatorTypesArraySchema,
  objectiveSchema,
  optionalSettingsSchema,
  querySchema,
  settingsSchema,
  sloDefinitionSchema,
  storedSloDefinitionSchema,
  timeWindowSchema,
} from '.';

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

/** Compiles only when A and B are mutually assignable. */
const expectMutuallyAssignable = <A, B>(
  ..._proof: MutuallyAssignable<A, B> extends true ? [] : ['types are not mutually assignable']
): void => undefined;

/** Compiles only when A is assignable to B. */
const expectAssignable = <A extends B, B>(): void => undefined;

type Wire<S extends t.Any> = t.OutputOf<S>;
type Decoded<S extends t.Any> = t.TypeOf<S>;

it('zod twins have the same wire (input) and decoded (output) types as the io-ts schemas', () => {
  // durationType: string ⇄ Duration
  expectMutuallyAssignable<z.input<typeof durationType>, Wire<typeof ioTsDurationType>>();
  expectMutuallyAssignable<z.output<typeof durationType>, Decoded<typeof ioTsDurationType>>();

  // dateType: string ⇄ Date
  expectMutuallyAssignable<z.input<typeof dateType>, Wire<typeof ioTsDateType>>();
  expectMutuallyAssignable<z.output<typeof dateType>, Decoded<typeof ioTsDateType>>();

  // timeWindowSchema carries the duration codec in both variants
  expectMutuallyAssignable<z.input<typeof timeWindowSchema>, Wire<typeof ioTsTimeWindowSchema>>();
  expectMutuallyAssignable<
    z.output<typeof timeWindowSchema>,
    Decoded<typeof ioTsTimeWindowSchema>
  >();

  // objectiveSchema carries an optional duration codec
  expectMutuallyAssignable<z.input<typeof objectiveSchema>, Wire<typeof ioTsObjectiveSchema>>();
  expectMutuallyAssignable<z.output<typeof objectiveSchema>, Decoded<typeof ioTsObjectiveSchema>>();

  // settingsSchema / optionalSettingsSchema carry duration codecs
  expectMutuallyAssignable<z.input<typeof settingsSchema>, Wire<typeof ioTsSettingsSchema>>();
  expectMutuallyAssignable<z.output<typeof settingsSchema>, Decoded<typeof ioTsSettingsSchema>>();
  expectMutuallyAssignable<
    z.input<typeof optionalSettingsSchema>,
    Wire<typeof ioTsOptionalSettingsSchema>
  >();
  expectMutuallyAssignable<
    z.output<typeof optionalSettingsSchema>,
    Decoded<typeof ioTsOptionalSettingsSchema>
  >();

  // indicatorSchema and querySchema are transform-free: wire and decoded agree
  expectMutuallyAssignable<z.input<typeof indicatorSchema>, Wire<typeof ioTsIndicatorSchema>>();
  expectMutuallyAssignable<z.output<typeof indicatorSchema>, Decoded<typeof ioTsIndicatorSchema>>();
  expectMutuallyAssignable<z.input<typeof querySchema>, Wire<typeof ioTsQuerySchema>>();
  expectMutuallyAssignable<z.output<typeof querySchema>, Decoded<typeof ioTsQuerySchema>>();

  // groupBy: string | string[]
  expectMutuallyAssignable<z.input<typeof groupBySchema>, Wire<typeof ioTsGroupBySchema>>();
  expectMutuallyAssignable<z.output<typeof groupBySchema>, Decoded<typeof ioTsGroupBySchema>>();

  // The full SLO definition: dates/durations as strings on the wire,
  // Date/Duration instances once decoded.
  expectMutuallyAssignable<
    z.input<typeof sloDefinitionSchema>,
    Wire<typeof ioTsSloDefinitionSchema>
  >();
  expectMutuallyAssignable<
    z.output<typeof sloDefinitionSchema>,
    Decoded<typeof ioTsSloDefinitionSchema>
  >();
  expectMutuallyAssignable<
    z.input<typeof storedSloDefinitionSchema>,
    Wire<typeof ioTsStoredSloDefinitionSchema>
  >();
  expectMutuallyAssignable<
    z.output<typeof storedSloDefinitionSchema>,
    Decoded<typeof ioTsStoredSloDefinitionSchema>
  >();

  // indicatorTypesArraySchema: same wire type; the decoded side is deliberately
  // narrowed from `string[]` to the indicator-type literal union (a strict
  // subset of what io-ts inferred), so only one-way assignability holds.
  expectMutuallyAssignable<
    z.input<typeof indicatorTypesArraySchema>,
    Wire<typeof ioTsIndicatorTypesArraySchema>
  >();
  expectAssignable<
    z.output<typeof indicatorTypesArraySchema>,
    Decoded<typeof ioTsIndicatorTypesArraySchema>
  >();

  // Runtime no-op: the assertions above are enforced by the compiler.
  expect(true).toBe(true);
});
