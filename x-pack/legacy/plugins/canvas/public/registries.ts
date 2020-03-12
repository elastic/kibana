/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore untyped module
import { addRegistries, register } from '@kbn/interpreter/common';
// @ts-ignore untyped local
import { elementsRegistry } from './lib/elements_registry';
// @ts-ignore untyped local
import { templatesRegistry } from './lib/templates_registry';
import { tagsRegistry } from './lib/tags_registry';
import { ElementFactory } from '../types';
// @ts-ignore untyped local
import { transitionsRegistry } from './lib/transitions_registry';

import {
  argTypeRegistry,
  datasourceRegistry,
  modelRegistry,
  transformRegistry,
  viewRegistry,
  // @ts-ignore untyped local
} from './expression_types';

export const registries = {};

export function initRegistries() {
  addRegistries(registries, {
    elements: elementsRegistry,
    transformUIs: transformRegistry,
    datasourceUIs: datasourceRegistry,
    modelUIs: modelRegistry,
    viewUIs: viewRegistry,
    argumentUIs: argTypeRegistry,
    templates: templatesRegistry,
    tagUIs: tagsRegistry,
    transitions: transitionsRegistry,
  });
}

export function addElements(elements: ElementFactory[]) {
  register(registries, { elements });
}

export function addTransformUIs(transformUIs: any[]) {
  register(registries, { transformUIs });
}

export function addDatasourceUIs(datasourceUIs: any[]) {
  register(registries, { datasourceUIs });
}

export function addModelUIs(modelUIs: any[]) {
  register(registries, { modelUIs });
}

export function addViewUIs(viewUIs: any[]) {
  register(registries, { viewUIs });
}

export function addArgumentUIs(argumentUIs: any[]) {
  register(registries, { argumentUIs });
}

export function addTemplates(templates: any[]) {
  register(registries, { templates });
}

export function addTagUIs(tagUIs: any[]) {
  register(registries, { tagUIs });
}

export function addTransitions(transitions: any[]) {
  register(registries, { transitions });
}

export function addBrowserFunctions(browserFunctions: any[]) {
  register(registries, { browserFunctions });
}
