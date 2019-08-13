/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import { getFormat, FormatFactory } from 'ui/visualize/loader/pipeline_helpers/utilities';
import { datatableVisualization } from './visualization';

import {
  renderersRegistry,
  functionsRegistry,
} from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { InterpreterSetup, RenderFunction } from '../interpreter_types';
import { datatable, datatableColumns, getDatatableRenderer } from './expression';

export interface DatatableVisualizationPluginSetupPlugins {
  interpreter: InterpreterSetup;
  // TODO this is a simulated NP plugin.
  // Once field formatters are actually migrated, the actual shim can be used
  fieldFormat: {
    formatFactory: FormatFactory;
  };
}

class DatatableVisualizationPlugin {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { interpreter, fieldFormat }: DatatableVisualizationPluginSetupPlugins
  ) {
    interpreter.functionsRegistry.register(() => datatableColumns);
    interpreter.functionsRegistry.register(() => datatable);
    interpreter.renderersRegistry.register(
      () => getDatatableRenderer(fieldFormat.formatFactory) as RenderFunction<unknown>
    );

    return datatableVisualization;
  }

  stop() {}
}

const plugin = new DatatableVisualizationPlugin();

export const datatableVisualizationSetup = () =>
  plugin.setup(null, {
    interpreter: {
      renderersRegistry,
      functionsRegistry,
    },
    fieldFormat: {
      formatFactory: getFormat,
    },
  });
export const datatableVisualizationStop = () => plugin.stop();
