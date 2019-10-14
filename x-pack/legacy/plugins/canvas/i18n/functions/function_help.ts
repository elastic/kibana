/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { CanvasFunction } from '../../types';
import { UnionToIntersection } from '../../types';

import { help as all } from './specs/all';
import { help as alterColumn } from './specs/alterColumn';
import { help as any } from './specs/any';
import { help as asFn } from './specs/as';
import { help as asset } from './specs/asset';
import { help as axisConfig } from './specs/axisConfig';
import { help as caseFn } from './specs/case';
import { help as clear } from './specs/clear';
import { help as columns } from './specs/columns';
import { help as compare } from './specs/compare';
import { help as containerStyle } from './specs/containerStyle';
import { help as context } from './specs/context';
import { help as csv } from './specs/csv';
import { help as date } from './specs/date';
import { help as demodata } from './specs/demodata';
import { help as doFn } from './specs/do';
import { help as dropdownControl } from './specs/dropdownControl';
import { help as eq } from './specs/eq';
import { help as escount } from './specs/escount';
import { help as esdocs } from './specs/esdocs';
import { help as essql } from './specs/essql';
import { help as exactly } from './specs/exactly';
import { help as filterrows } from './specs/filterrows';
import { help as formatdate } from './specs/formatdate';
import { help as formatnumber } from './specs/formatnumber';
import { help as getCell } from './specs/getCell';
import { help as gt } from './specs/gt';
import { help as gte } from './specs/gte';
import { help as head } from './specs/head';
import { help as ifFn } from './specs/if';
import { help as image } from './specs/image';
import { help as joinRows } from './specs/join_rows';
import { help as location } from './specs/location';
import { help as lt } from './specs/lt';
import { help as lte } from './specs/lte';
import { help as mapColumn } from './specs/mapColumn';
import { help as markdown } from './specs/markdown';
import { help as math } from './specs/math';
import { help as metric } from './specs/metric';
import { help as neq } from './specs/neq';
import { help as palette } from './specs/palette';
import { help as pie } from './specs/pie';
import { help as plot } from './specs/plot';
import { help as ply } from './specs/ply';
import { help as pointseries } from './specs/pointseries';
import { help as progress } from './specs/progress';
import { help as render } from './specs/render';
import { help as repeatImage } from './specs/repeatImage';
import { help as replace } from './specs/replace';
import { help as revealImage } from './specs/revealImage';
import { help as rounddate } from './specs/rounddate';
import { help as rowCount } from './specs/rowCount';
import { help as savedMap } from './specs/saved_map';
import { help as savedSearch } from './specs/saved_search';
import { help as savedVisualization } from './specs/saved_visualization';
import { help as seriesStyle } from './specs/seriesStyle';
import { help as shape } from './specs/shape';
import { help as sort } from './specs/sort';
import { help as staticColumn } from './specs/staticColumn';
import { help as string } from './specs/string';
import { help as switchFn } from './specs/switch';
import { help as table } from './specs/table';
import { help as tail } from './specs/tail';
import { help as timefilter } from './specs/timefilter';
import { help as timefilterControl } from './specs/timefilterControl';
import { help as urlparam } from './specs/urlparam';

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
  asset,
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
  formatdate,
  formatnumber,
  getCell,
  gt,
  gte,
  head,
  if: ifFn,
  joinRows,
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
  savedMap,
  savedSearch,
  savedVisualization,
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
