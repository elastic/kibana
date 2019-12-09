/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/plugins/expressions/common';
import { CanvasFunction } from '../../types';
import { UnionToIntersection } from '../../types';

import { help as all } from './dict/all';
import { help as alterColumn } from './dict/alter_column';
import { help as any } from './dict/any';
import { help as asFn } from './dict/as';
import { help as asset } from './dict/asset';
import { help as axisConfig } from './dict/axis_config';
import { help as caseFn } from './dict/case';
import { help as clear } from './dict/clear';
import { help as columns } from './dict/columns';
import { help as compare } from './dict/compare';
import { help as containerStyle } from './dict/container_style';
import { help as context } from './dict/context';
import { help as csv } from './dict/csv';
import { help as date } from './dict/date';
import { help as demodata } from './dict/demodata';
import { help as doFn } from './dict/do';
import { help as dropdownControl } from './dict/dropdown_control';
import { help as eq } from './dict/eq';
import { help as escount } from './dict/escount';
import { help as esdocs } from './dict/esdocs';
import { help as essql } from './dict/essql';
import { help as exactly } from './dict/exactly';
import { help as filterrows } from './dict/filterrows';
import { help as filters } from './dict/filters';
import { help as formatdate } from './dict/formatdate';
import { help as formatnumber } from './dict/formatnumber';
import { help as getCell } from './dict/get_cell';
import { help as gt } from './dict/gt';
import { help as gte } from './dict/gte';
import { help as head } from './dict/head';
import { help as ifFn } from './dict/if';
import { help as image } from './dict/image';
import { help as joinRows } from './dict/join_rows';
import { help as location } from './dict/location';
import { help as lt } from './dict/lt';
import { help as lte } from './dict/lte';
import { help as mapColumn } from './dict/map_column';
import { help as markdown } from './dict/markdown';
import { help as math } from './dict/math';
import { help as metric } from './dict/metric';
import { help as neq } from './dict/neq';
import { help as palette } from './dict/palette';
import { help as pie } from './dict/pie';
import { help as plot } from './dict/plot';
import { help as ply } from './dict/ply';
import { help as pointseries } from './dict/pointseries';
import { help as progress } from './dict/progress';
import { help as render } from './dict/render';
import { help as repeatImage } from './dict/repeat_image';
import { help as replace } from './dict/replace';
import { help as revealImage } from './dict/reveal_image';
import { help as rounddate } from './dict/rounddate';
import { help as rowCount } from './dict/row_count';
import { help as savedMap } from './dict/saved_map';
import { help as savedSearch } from './dict/saved_search';
import { help as savedVisualization } from './dict/saved_visualization';
import { help as seriesStyle } from './dict/series_style';
import { help as shape } from './dict/shape';
import { help as sort } from './dict/sort';
import { help as staticColumn } from './dict/static_column';
import { help as string } from './dict/string';
import { help as switchFn } from './dict/switch';
import { help as table } from './dict/table';
import { help as tail } from './dict/tail';
import { help as timefilter } from './dict/timefilter';
import { help as timefilterControl } from './dict/timefilter_control';
import { help as timelion } from './dict/timelion';
import { help as to } from './dict/to';
import { help as urlparam } from './dict/urlparam';

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
  filters,
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
  timelion,
  to,
  urlparam,
});
