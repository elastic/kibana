/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { XYRender } from '@kbn/expression-xy-plugin/common/types';

/**
 * Spike C finding: the registered `extendedDataLayer`/`xyVis` expression *function*
 * implementations (`xyVisFn`/`extendedDataLayerFn` in
 * `expression_xy/common/expression_functions`) run correctly outside Kibana's ES-backed
 * pipeline, against a literal in-memory {@link Datatable}, with **no browser and no
 * Elasticsearch call** -- this is the mechanism Spike C set out to prove for Tier 1/2
 * (expression-family) panels.
 *
 * Two things the full `ExpressionsService.run()` pipeline normally supplies had to be
 * reconstructed by hand, because they aren't optional at the type level even though they
 * have no meaningful value outside a real Kibana request:
 *
 * 1. `handlers.inspectorAdapters` -- `xyVisFn` unconditionally reads
 *    `handlers.inspectorAdapters.tables` (see `logDatatable` in
 *    `expression_xy/common/utils/log_datatables.ts`) to record the inspector's "request"
 *    tab. A `{}` stub (no `.tables`) short-circuits that whole block safely.
 * 2. `handlers.variables` -- read unguarded (no `?.`) in `xyVisFn` for
 *    `canNavigateToLens`/`overrides`. An empty object is enough.
 *
 * Argument *defaults* (`valueLabels: 'hide'`, `fittingFunction: 'None'`, `curveType:
 * 'LINEAR'`, ...) are normally filled in by the expression-language argument schema
 * before `fn` ever runs. Calling the function directly (as this module does, instead of
 * going through `ExpressionsService.run(exprString, ...)`) skips that schema layer, so
 * every arg the function's internal `validate*` calls branch on has to be supplied
 * explicitly here or the function throws (`valueLabels` argument is applicable only for
 * bar charts, etc.). Driving these functions through the real expression-language string
 * (as `expressions.execute()` will for the actual export type) avoids this by construction
 * -- see the package README matrix for which path Spike C's worker renderer registry uses.
 */
export interface RunXyExpressionParams {
  table: Datatable;
  seriesType: 'line' | 'bar' | 'area';
  xAccessor: string;
  accessors: string[];
}

export const runXyExpressionFunctions = async ({
  table,
  seriesType,
  xAccessor,
  accessors,
}: RunXyExpressionParams): Promise<XYRender> => {
  const {
    xyVisFunction,
    extendedDataLayerFunction,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
  } = require('@kbn/expression-xy-plugin/common/expression_functions');

  const handlers = {
    variables: {},
    inspectorAdapters: {},
    getExecutionContext: () => undefined,
    isSyncColorsEnabled: () => false,
    isSyncTooltipsEnabled: () => false,
    isSyncCursorEnabled: () => true,
  };

  const dataLayer = await extendedDataLayerFunction.fn(
    table,
    { seriesType, xAccessor, accessors },
    handlers
  );

  return xyVisFunction.fn(
    table,
    {
      seriesType,
      legend: { type: 'lens_xy_legendConfig', isVisible: false, position: 'right' },
      layers: [dataLayer],
      valueLabels: 'hide',
      fittingFunction: 'None',
      curveType: 'LINEAR',
    },
    handlers
  ) as Promise<XYRender>;
};
