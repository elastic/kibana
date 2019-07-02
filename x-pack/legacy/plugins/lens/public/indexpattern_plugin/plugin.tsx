/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import chrome from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { getIndexPatternDatasource } from './indexpattern';

import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
// @ts-ignore untyped dependency
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { renameColumns } from './rename_columns';
import { calculateFilterRatio } from './filter_ratio';

// TODO these are intermediary types because interpreter is not typed yet
// They can get replaced by references to the real interfaces as soon as they
// are available

export interface IndexPatternDatasourcePluginPlugins {
  interpreter: InterpreterSetup;
}

export interface InterpreterSetup {
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

class IndexPatternDatasourcePlugin {
  constructor() {}

  setup(_core: CoreSetup | null, { interpreter }: IndexPatternDatasourcePluginPlugins) {
    interpreter.functionsRegistry.register(() => renameColumns);
    interpreter.functionsRegistry.register(() => calculateFilterRatio);
    return getIndexPatternDatasource(chrome, toastNotifications);
  }

  stop() {}
}

const plugin = new IndexPatternDatasourcePlugin();

export const indexPatternDatasourceSetup = () =>
  plugin.setup(null, {
    interpreter: {
      functionsRegistry,
    },
  });
export const indexPatternDatasourceStop = () => plugin.stop();
