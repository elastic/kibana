/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { CanvasFunction } from '../../functions/types';
import { UnionToIntersection } from '../../functions/types';

import { help as all } from './all';
import { help as alterColumn } from './alterColumn';
import { help as any } from './any';
import { help as asFn } from './as';
import { help as axisConfig } from './axisConfig';
import { help as caseFn } from './case';
import { help as clear } from './clear';
import { help as columns } from './columns';
import { help as compare } from './compare';
import { help as containerStyle } from './containerStyle';
import { help as context } from './context';
import { help as csv } from './csv';
import { help as date } from './date';
import { help as demodata } from './demodata';
import { help as doFn } from './do';
import { help as dropdownControl } from './dropdownControl';
import { help as eq } from './eq';
import { help as escount } from './escount';
import { help as esdocs } from './esdocs';
import { help as essql } from './essql';
import { help as exactly } from './exactly';
import { help as filterrows } from './filterrows';
import { help as font } from './font';
import { help as formatdate } from './formatdate';
import { help as formatnumber } from './formatnumber';
import { help as getCell } from './getCell';
import { help as gt } from './gt';
import { help as gte } from './gte';
import { help as head } from './head';
import { help as ifFn } from './if';
import { help as image } from './image';
import { help as location } from './location';
import { help as lt } from './lt';
import { help as lte } from './lte';
import { help as mapColumn } from './mapColumn';
import { help as markdown } from './markdown';
import { help as math } from './math';
import { help as metric } from './metric';
import { help as neq } from './neq';
import { help as palette } from './palette';
import { help as pie } from './pie';
import { help as plot } from './plot';
import { help as ply } from './ply';
import { help as pointseries } from './pointseries';
import { help as progress } from './progress';
import { help as render } from './render';
import { help as repeatImage } from './repeatImage';
import { help as replace } from './replace';
import { help as revealImage } from './revealImage';
import { help as rounddate } from './rounddate';
import { help as rowCount } from './rowCount';
import { help as seriesStyle } from './seriesStyle';
import { help as shape } from './shape';
import { help as sort } from './sort';
import { help as staticColumn } from './staticColumn';
import { help as string } from './string';
import { help as switchFn } from './switch';
import { help as table } from './table';
import { help as tail } from './tail';
import { help as timefilter } from './timefilter';
import { help as timefilterControl } from './timefilterControl';
import { help as urlparam } from './urlparam';

/**
 * This type defines an entry in the `FunctionHelpMap`.  It uses 
 * an `ExpressionFunction` to infer its `Arguments` in order to strongly-type that 
 * entry.
 * 
 * For example:
 * 
```
   interface Arguments {
     bar: string;
     baz: number;
   }

   function foo(): ExpressionFunction<'foo', Context, Arguments, Return> {
     // ...
   }

   const help: FunctionHelp<typeof foo> = {
     help: 'Some help for foo',
     args: {
       bar: 'Help for bar.',   // pass; error if missing
       baz: 'Help for baz.',   // pass; error if missing
       zap: 'Help for zap.`,   // error: zap doesn't exist
     }
   };
```
 * This allows one to ensure each argument is present, and no extraneous arguments
 * remain.
 */
export type FunctionHelp<T> = T extends ExpressionFunction<
  infer Name,
  infer Context,
  infer Arguments,
  infer Return
>
  ? {
      help: string;
      args: { [key in keyof Arguments]: string };
    }
  : never;

// This internal type infers a Function name and uses `FunctionHelp` above to build
// a dictionary entry.  This can be used to ensure every Function is defined and all
// Arguments have help strings.
//
// For example:
//
// function foo(): ExpressionFunction<'foo', Context, Arguments, Return> {
//   // ...
// }
//
// const map: FunctionHelpMap<typeof foo> = {
//   foo: FunctionHelp<typeof foo>,
// }
//
// Given a collection of functions, the map would contain each entry.
//
type FunctionHelpMap<T> = T extends ExpressionFunction<
  infer Name,
  infer Context,
  infer Arguments,
  infer Return
>
  ? { [key in Name]: FunctionHelp<T> }
  : never;

// This internal type represents an exhaustive dictionary of `FunctionHelp` types,
// organized by Function Name and then Function Argument.
//
// This type indexes the existing function factories, reverses the union to an
// intersection, and produces the dictionary of strings.
type FunctionHelpDict = UnionToIntersection<FunctionHelpMap<CanvasFunction>>;

/**
 * Help text for Canvas Functions should be properly localized. This function will
 * return a dictionary of help strings, organized by `CanvasFunction` specification
 * and then by available arguments within each `CanvasFunction`.
 *
 * This a function, rather than an object, to future-proof string initialization,
 * if ever necessary.
 */
export const getFunctionHelp = (): FunctionHelpDict => ({
  all,
  alterColumn,
  any,
  as: asFn,
  axisConfig,
  case: caseFn,
  clear,
  columns,
  compare,
  containerStyle,
  context,
  csv,
  date,
  demodata,
  do: doFn,
  dropdownControl,
  eq,
  escount,
  esdocs,
  essql,
  exactly,
  filterrows,
  font,
  formatdate,
  formatnumber,
  getCell,
  gt,
  gte,
  head,
  if: ifFn,
  image,
  location,
  lt,
  lte,
  mapColumn,
  markdown,
  math,
  metric,
  neq,
  palette,
  pie,
  plot,
  ply,
  pointseries,
  progress,
  render,
  repeatImage,
  replace,
  revealImage,
  rounddate,
  rowCount,
  seriesStyle,
  shape,
  sort,
  staticColumn,
  string,
  switch: switchFn,
  table,
  tail,
  timefilter,
  timefilterControl,
  urlparam,
});
