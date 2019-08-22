/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Registry } from '@kbn/interpreter/target/common';
import { CoreSetup } from 'src/core/public';
import chrome, { Chrome } from 'ui/chrome';
import { Plugin as EmbeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
import { setup as embeddablePlugin } from '../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public/legacy';
import { setup as data } from '../../../../../../src/legacy/core_plugins/data/public/legacy';
import { ExpressionFunction } from '../../../../../../src/legacy/core_plugins/interpreter/public';
import { functionsRegistry } from '../../../../../../src/legacy/core_plugins/interpreter/public/registries';
import { mergeTables } from './merge_tables';
import { EmbeddableFactory } from './embeddable/embeddable_factory';

export interface EditorFrameSetupPlugins {
  data: typeof data;
  chrome: Chrome;
  embeddables: ReturnType<EmbeddablePlugin['setup']>;
  interpreter: InterpreterSetup;
}

export interface InterpreterSetup {
  functionsRegistry: Registry<
    ExpressionFunction<string, unknown, unknown, unknown>,
    ExpressionFunction<string, unknown, unknown, unknown>
  >;
}

export class EditorFramePlugin {
  constructor() {}

  public setup(_core: CoreSetup | null, plugins: EditorFrameSetupPlugins) {
    plugins.interpreter.functionsRegistry.register(() => mergeTables);

    plugins.embeddables.registerEmbeddableFactory(
      'lens',
      new EmbeddableFactory(
        plugins.chrome,
        plugins.data.expressions.ExpressionRenderer,
        plugins.data.indexPatterns.indexPatterns
      )
    );

    return plugins;
  }

  public stop() {
    return {};
  }
}

const editorFrame = new EditorFramePlugin();

export const editorFrameSetup = () =>
  editorFrame.setup(null, {
    data,
    chrome,
    embeddables: embeddablePlugin,
    interpreter: {
      functionsRegistry,
    },
  });

export const editorFrameStop = () => editorFrame.stop();
