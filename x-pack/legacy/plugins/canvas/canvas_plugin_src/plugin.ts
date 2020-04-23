/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { CanvasSetup } from '../public';
import { EmbeddableStart } from '../../../../../src/plugins/embeddable/public';
import { UiActionsStart } from '../../../../../src/plugins/ui_actions/public';
import { Start as InspectorStart } from '../../../../../src/plugins/inspector/public';

import { functions } from './functions/browser';
import { typeFunctions } from './expression_types';
// @ts-ignore: untyped local
import { renderFunctions, renderFunctionFactories } from './renderers';

import { elementSpecs } from './elements';
// @ts-ignore Untyped Local
import { transformSpecs } from './uis/transforms';
// @ts-ignore Untyped Local
import { datasourceSpecs } from './uis/datasources';
// @ts-ignore Untyped Local
import { modelSpecs } from './uis/models';
// @ts-ignore Untyped Local
import { viewSpecs } from './uis/views';
// @ts-ignore Untyped Local
import { args as argSpecs } from './uis/arguments';
import { tagSpecs } from './uis/tags';
import { templateSpecs } from './templates';

interface SetupDeps {
  canvas: CanvasSetup;
}

export interface StartDeps {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  inspector: InspectorStart;
}

/** @internal */
export class CanvasSrcPlugin implements Plugin<void, void, SetupDeps, StartDeps> {
  public setup(core: CoreSetup<StartDeps>, plugins: SetupDeps) {
    plugins.canvas.addFunctions(functions);
    plugins.canvas.addTypes(typeFunctions);

    plugins.canvas.addRenderers(renderFunctions);

    core.getStartServices().then(([coreStart, depsStart]) => {
      plugins.canvas.addRenderers(
        renderFunctionFactories.map((factory: any) => factory(coreStart, depsStart))
      );
    });

    plugins.canvas.addElements(elementSpecs);
    plugins.canvas.addDatasourceUIs(datasourceSpecs);
    plugins.canvas.addModelUIs(modelSpecs);
    plugins.canvas.addViewUIs(viewSpecs);
    plugins.canvas.addArgumentUIs(argSpecs);
    plugins.canvas.addTagUIs(tagSpecs);
    plugins.canvas.addTemplates(templateSpecs);
    plugins.canvas.addTransformUIs(transformSpecs);
  }

  public start(core: CoreStart, plugins: StartDeps) {}
}
