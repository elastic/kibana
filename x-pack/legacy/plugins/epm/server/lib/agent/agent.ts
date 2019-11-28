/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';

interface Manifest {
  vars: VarsEntry[];
}

interface VarsEntry {
  name: string;
  default: string;
}
/**
 * This takes a manifest object as input and merges it with the input template.
 * It returns the resolved template as a string.
 */
export function createInput(manifest: Manifest, inputTemplate: string): string {
  const view: Record<VarsEntry['name'], VarsEntry['default']> = {};

  for (const v of manifest.vars) {
    view[v.name] = v.default;
  }

  // This disables escaping. All our configs should be never escaped.
  // Otherwise the creator would have to prefix all variables with &
  // which is not very user friendly.
  Mustache.escape = function(v) {
    return v;
  };
  // Mustache.parse(inputTemplate);
  return Mustache.render(inputTemplate, view);
}
