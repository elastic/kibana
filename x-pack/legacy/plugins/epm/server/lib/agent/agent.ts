/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';

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

  const template = Handlebars.compile(inputTemplate);
  return template(view);
}
