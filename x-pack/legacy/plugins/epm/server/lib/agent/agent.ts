/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';

interface Manifest {
  vars: object[];
}

/**
 * This takes a manifest object as input and merges it with the input template.
 * It returns the resolved template as a string.
 */
export function createInput(manifest: Manifest, inputTemplate: string): string {
  const view = {};

  for (const v of manifest.vars) {
    console.log(v.name);
    view[v.name] = v.default;
  }

  // Mustache.parse(inputTemplate);
  return Mustache.render(inputTemplate, view);
}
