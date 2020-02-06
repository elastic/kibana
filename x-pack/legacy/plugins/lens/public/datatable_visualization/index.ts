/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'src/core/public';
import { datatableVisualization } from './visualization';
import { ExpressionsSetup } from '../../../../../../src/plugins/expressions/public';
import { datatable, datatableColumns, getDatatableRenderer } from './expression';
import { FormatFactory } from '../legacy_imports';

export interface DatatableVisualizationPluginSetupPlugins {
  expressions: ExpressionsSetup;
  formatFactory: FormatFactory;
}

export class DatatableVisualization {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { expressions, formatFactory }: DatatableVisualizationPluginSetupPlugins
  ) {
    expressions.registerFunction(() => datatableColumns);
    expressions.registerFunction(() => datatable);
    expressions.registerRenderer(() => getDatatableRenderer(formatFactory));

    return datatableVisualization;
  }
}
