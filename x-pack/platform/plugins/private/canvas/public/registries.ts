/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addRegistries, register } from '@kbn/interpreter';
// @ts-expect-error untyped local
import { elementsRegistry } from './lib/elements_registry';
// @ts-expect-error untyped local
import { templatesRegistry } from './lib/templates_registry';
import { tagsRegistry } from './lib/tags_registry';
// @ts-expect-error untyped local
import { transitionsRegistry } from './lib/transitions_registry';

import {
  argTypeRegistry,
  datasourceRegistry,
  modelRegistry,
  transformRegistry,
  viewRegistry,
} from './expression_types';
import { SetupRegistries } from './plugin_api';

export let registries = {};

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

export async function populateRegistries(setupRegistries: SetupRegistries) {
  // Our setup registries could contain definitions or a function that would
  // return a promise of definitions.
  // We need to call all the fns and then wait for all of the promises to be resolved
  const resolvedRegistries: Record<string, any[]> = {};
  const promises = Object.entries(setupRegistries).map(async ([key, specs]) => {
    const resolved = await (
      await Promise.all(specs.map((fn) => (typeof fn === 'function' ? fn() : fn)))
    ).flat();

    resolvedRegistries[key] = resolved;
  });

  // Now, wait for all of the promise registry promises to resolve and our resolved registry will be ready
  // and we can proceeed
  await Promise.all(promises);

  register(registries, resolvedRegistries);
}

export function destroyRegistries() {
  registries = {};
}
