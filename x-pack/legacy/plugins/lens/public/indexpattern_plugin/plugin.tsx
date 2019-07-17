/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
// The following dependencies on ui/* and src/legacy/core_plugins must be mocked when testing
import chrome, { Chrome } from 'ui/chrome';
import { toastNotifications } from 'ui/notify';
import { Storage } from 'ui/storage';
import { localStorage } from 'ui/storage/storage_service';
import { DataSetup } from '../../../../../../src/legacy/core_plugins/data/public';
import { data as dataSetup } from '../../../../../../src/legacy/core_plugins/data/public/setup';
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { getIndexPatternDatasource } from './indexpattern';
import { renameColumns } from './rename_columns';
import { calculateFilterRatio } from './filter_ratio';

// TODO these are intermediary types because interpreter is not typed yet
// They can get replaced by references to the real interfaces as soon as they
// are available

export interface IndexPatternDatasourcePluginPlugins {
  chrome: Chrome;
  interpreter: InterpreterSetup;
  data: DataSetup;
  storage: Storage;
  toastNotifications: typeof toastNotifications;
}

export interface InterpreterSetup {
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

class IndexPatternDatasourcePlugin {
  constructor() {}

  setup(
    _core: CoreSetup | null,
    { interpreter, data, storage, toastNotifications: toast }: IndexPatternDatasourcePluginPlugins
  ) {
    interpreter.functionsRegistry.register(() => renameColumns);
    interpreter.functionsRegistry.register(() => calculateFilterRatio);
    return getIndexPatternDatasource({
      chrome,
      interpreter,
      toastNotifications: toast,
      data,
      storage,
    });
  }

  stop() {}
}

const plugin = new IndexPatternDatasourcePlugin();

export const indexPatternDatasourceSetup = () =>
  plugin.setup(null, {
    chrome,
    interpreter: {
      functionsRegistry,
    },
    data: dataSetup,
    storage: localStorage,
    toastNotifications,
  });
export const indexPatternDatasourceStop = () => plugin.stop();
