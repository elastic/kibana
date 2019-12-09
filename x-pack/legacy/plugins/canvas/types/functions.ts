/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common';
import { functions as commonFunctions } from '../canvas_plugin_src/functions/common';
import { functions as browserFunctions } from '../canvas_plugin_src/functions/browser';
import { functions as serverFunctions } from '../canvas_plugin_src/functions/server';
import { clientFunctions } from '../public/functions';

/**
 * Utility type for converting a union of types into an intersection.
 *
 * This is a bit of "black magic" that will interpret a Union type as an Intersection
 * type.  This is necessary in this case of distiguishing one collection from
 * another in `FunctionError` and `FunctionStrings`.
 */
// prettier-ignore
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Utility type: gathers values of a collection as a type for use as a type.
 */
export type ValuesOf<T extends any[]> = T[number];

type valueof<T> = T[keyof T];
type ValuesOfUnion<T> = T extends any ? valueof<T> : never;

/**
 * A `ExpressionFunctionFactory` is a powerful type used for any function that produces
 * an `ExpressionFunction`. If it does not meet the signature for such a function,
 * or if it does not produce an `ExpressionFunction`, it will be typed as
 * returning `never`.
 *
 * This type will, in turn, strongly-type both a factory that produces an
 * `ExpressionFunction`, *and* the `ExpressionFunction` itself.  This means one can
 * effectively introspect properties from the factory in other places.
 *
 * As an example, given the following:
 * 
```
   function foo(): ExpressionFunction<'foo', Context, Arguments, Return> {
     // ...
   }
```
 *
 * `foo` would be an `ExpressionFunctionFactory`.  Using the `FunctionFactory` type allows one to
 * introspect the generics from the `ExpressionFunction` without needing to access it
 * directly:
 * 
```
    type Baz = FunctionFactory<typeof foo>;
```
 *
 * Thus, in reality, and in a Typescript-enabled IDE, one would see the following definition 
 * for `Baz`:
 * 
```
    type Baz = ExpressionFunction<"foo", Context, Arguments, Return>
```
 *
 * Why is this useful?  Given a collection of `ExpressionFunctions` that have been registered
 * with the `Interpreter`, you could take that collection and do any number of other
 * introspected, strongly-typed operations.
 *
 * One example would to create a dictionary of all of the names of the `ExpressionFunctions`
 * that have been registered:
 *
 ```
    const someFunctions = [
      functionOne: ExpressionFunction<'functionOne', Context, Arguments, Return>,
      functionTwo: ExpressionFunction<'functionTwo', Context, Arguments, Return>,
      functionThree: ExpressionFunction<'functionThree', Context, Arguments, Return>,
    ];

    export type FunctionName = FunctionFactory<typeof someFunctions[number]>['name'];
    
    const name: FunctionName = 'functionOne';  // passes
    const nonName: FunctionName = 'elastic`;  // fails
```
 *
 * A more practical example would be to use the introspected generics to create dictionaries, 
 * like of help strings or documentation, that would contain only valid functions and their 
 * generics, but nothing extraneous.  This is actually used in a number of built-in functions 
 * in Kibana and Canvas.
 */
// prettier-ignore
export type ExpressionFunctionFactory<Name extends string, Context, Arguments, Return> = 
() => ExpressionFunction<Name, Context, Arguments, Return>;

/**
 * `FunctionFactory` exists as a name shim between the `ExpressionFunction` type and
 * the functions that already existed in Canvas.  This type can likely be removed, and
 * callsites converted, if `ExpressionFunctionFactory` is moved into the Interpreter, (perhaps
 * with a shorter name).
 */
// prettier-ignore
export type FunctionFactory<FnFactory> = 
  FnFactory extends ExpressionFunctionFactory<infer Name, infer Context, infer Arguments, infer Return> ?
    ExpressionFunction<Name, Context, Arguments, Return> :
    never;

type CommonFunction = FunctionFactory<typeof commonFunctions[number]>;
type BrowserFunction = FunctionFactory<typeof browserFunctions[number]>;
type ServerFunction = FunctionFactory<typeof serverFunctions[number]>;
type ClientFunctions = FunctionFactory<typeof clientFunctions[number]>;

/**
 * A collection of all Canvas Functions.
 */
export type CanvasFunction = CommonFunction | BrowserFunction | ServerFunction | ClientFunctions;

/**
 * A union type of all Canvas Function names.
 */
export type CanvasFunctionName = CanvasFunction['name'];

/**
 * A union type of all Canvas Function argument objects.
 */
export type CanvasArg = CanvasFunction['args'];

export type CanvasArgValue = ValuesOfUnion<CanvasFunction['args']>;

/**
 * Represents a function called by the `case` Function.
 */
export interface Case {
  type: 'case';
  matches: any;
  result: any;
}

export enum Legend {
  NORTH_WEST = 'nw',
  SOUTH_WEST = 'sw',
  NORTH_EAST = 'ne',
  SOUTH_EAST = 'se',
}

export enum Position {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
}

export interface SeriesStyle {
  type: 'seriesStyle';
  bars: number;
  color: string;
  fill: number;
  horizontalBars: boolean;
  label: string;
  lines: number;
  points: number;
  stack: number;
}

export interface Palette {
  type: 'palette';
  colors: string[];
  gradient: boolean;
}

export interface Ticks {
  x: {
    hash: Record<string, any>;
    counter: number;
  };
  y: {
    hash: Record<string, any>;
    counter: number;
  };
}

export interface AxisConfig {
  type: 'axisConfig';
  show: boolean;
  position: Position;
  min: number;
  max: number;
  tickSize: number;
}

/**
 * A Utility function that Typescript can use to determine if an object is an AxisConfig.
 * @param axisConfig
 */
export const isAxisConfig = (axisConfig: any): axisConfig is AxisConfig =>
  !!axisConfig && axisConfig.type === 'axisConfig';
