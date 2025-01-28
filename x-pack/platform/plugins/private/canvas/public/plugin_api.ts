/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import {
  AnyExpressionFunctionDefinition,
  AnyExpressionTypeDefinition,
  AnyExpressionRenderDefinition,
  AnyRendererFactory,
} from '../types';
import { ElementFactory } from '../types';

type SpecPromiseFn<T extends any> = () => Promise<T[]>;
type AddToRegistry<T extends any> = (add: T[] | SpecPromiseFn<T>) => void;
type AddSpecsToRegistry<T extends any> = (add: T[]) => void;

export interface CanvasApi {
  addArgumentUIs: AddToRegistry<any>;
  addDatasourceUIs: AddToRegistry<any>;
  addElements: AddToRegistry<ElementFactory>;
  addFunctions: AddSpecsToRegistry<
    (() => AnyExpressionFunctionDefinition) | AnyExpressionFunctionDefinition
  >;
  addModelUIs: AddToRegistry<any>;
  addRenderers: AddSpecsToRegistry<AnyRendererFactory>;
  addTagUIs: AddToRegistry<any>;
  addTransformUIs: AddToRegistry<any>;
  addTransitions: AddToRegistry<any>;
  addTypes: AddSpecsToRegistry<() => AnyExpressionTypeDefinition>;
  addViewUIs: AddToRegistry<any>;
}

export interface SetupRegistries extends Record<string, any[]> {
  elements: Array<ElementFactory | SpecPromiseFn<ElementFactory>>;
  transformUIs: any[];
  datasourceUIs: any[];
  modelUIs: any[];
  viewUIs: any[];
  argumentUIs: any[];
  tagUIs: any[];
  transitions: any[];
}

export function getPluginApi(expressionsPluginSetup: ExpressionsSetup): {
  api: CanvasApi;
  registries: SetupRegistries;
} {
  const registries: SetupRegistries = {
    elements: [],
    transformUIs: [],
    datasourceUIs: [],
    modelUIs: [],
    viewUIs: [],
    argumentUIs: [],
    tagUIs: [],
    transitions: [],
  };

  const addToRegistry = <T>(registry: Array<T | SpecPromiseFn<T>>) => {
    return (entries: T[] | SpecPromiseFn<T>) => {
      if (Array.isArray(entries)) {
        registry.push(...entries);
      } else {
        registry.push(entries);
      }
    };
  };

  const api: CanvasApi = {
    // Functions, types and renderers are registered directly to expression plugin
    addFunctions: (fns) => {
      fns.forEach((fn) => {
        expressionsPluginSetup.registerFunction(fn);
      });
    },
    addTypes: (types) => {
      types.forEach((type) => {
        expressionsPluginSetup.registerType(type as any);
      });
    },
    addRenderers: (renderers) => {
      renderers.forEach((r) => {
        // There is an issue of the canvas render definition not matching the expression render definition
        // due to our handlers needing additional methods.  For now, we are going to cast to get to the proper
        // type, but we should work with AppArch to figure out how the Handlers can be genericized
        expressionsPluginSetup.registerRenderer(r as unknown as AnyExpressionRenderDefinition);
      });
    },

    // All these others are local to canvas, and they will only register on start
    addElements: addToRegistry(registries.elements),
    addTransformUIs: addToRegistry(registries.transformUIs),
    addDatasourceUIs: addToRegistry(registries.datasourceUIs),
    addModelUIs: addToRegistry(registries.modelUIs),
    addViewUIs: addToRegistry(registries.viewUIs),
    addArgumentUIs: addToRegistry(registries.argumentUIs),
    addTagUIs: addToRegistry(registries.tagUIs),
    addTransitions: addToRegistry(registries.transitions),
  };

  return { api, registries };
}
