/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ChartsPluginStart } from '@kbn/charts-plugin/public';
import { PresentationUtilPluginStart } from '@kbn/presentation-util-plugin/public';
import { EmbeddableStart } from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { Start as InspectorStart } from '@kbn/inspector-plugin/public';
import { CanvasSetup } from '../public';

import { functions } from './functions/browser';
import { initFunctions } from './functions/external';
import { typeFunctions } from './expression_types';
import { renderFunctions, renderFunctionFactories } from './renderers';

interface SetupDeps {
  canvas: CanvasSetup;
}

export interface StartDeps {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStart;
  charts: ChartsPluginStart;
  presentationUtil: PresentationUtilPluginStart;
}

export type SetupInitializer<T> = (core: CoreSetup<StartDeps>, plugins: SetupDeps) => T;
export type StartInitializer<T> = (core: CoreStart, plugins: StartDeps) => T;

/** @internal */
export class CanvasSrcPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.canvas.addFunctions(functions);
    plugins.canvas.addTypes(typeFunctions);

    plugins.canvas.addRenderers(renderFunctions);

    core.getStartServices().then(([coreStart, depsStart]) => {
      const externalFunctions = initFunctions({
        embeddablePersistableStateService: {
          extract: depsStart.embeddable.extract,
          inject: depsStart.embeddable.inject,
          getAllMigrations: depsStart.embeddable.getAllMigrations,
        },
      });
      plugins.canvas.addFunctions(externalFunctions);
      plugins.canvas.addRenderers(
        renderFunctionFactories.map((factory: any) => factory(coreStart, depsStart))
      );
    });

    plugins.canvas.addDatasourceUIs(async () => {
      // @ts-expect-error
      const { datasourceSpecs } = await import('./canvas_addons');
      return datasourceSpecs;
    });

    plugins.canvas.addElements(async () => {
      const { initializeElements } = await import('./canvas_addons');
      return initializeElements(core, plugins);
    });

    plugins.canvas.addModelUIs(async () => {
      // @ts-expect-error Untyped local
      const { modelSpecs } = await import('./canvas_addons');
      return modelSpecs;
    });

    plugins.canvas.addViewUIs(async () => {
      const { initializeViews } = await import('./canvas_addons');

      return initializeViews(core, plugins);
    });

    plugins.canvas.addArgumentUIs(async () => {
      const { initializeArgs } = await import('./canvas_addons');
      return initializeArgs(core, plugins);
    });

    plugins.canvas.addTagUIs(async () => {
      const { tagSpecs } = await import('./canvas_addons');
      return tagSpecs;
    });

    plugins.canvas.addTransformUIs(async () => {
      // @ts-expect-error Untyped local
      const { transformSpecs } = await import('./canvas_addons');
      return transformSpecs;
    });
  }

  public start(core: CoreStart, plugins: StartDeps) {}
}
