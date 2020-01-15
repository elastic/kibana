/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Handlebars from 'handlebars';
import { Dataset } from '../../../common/types';

/**
 * This takes a dataset object as input and merges it with the input template.
 * It returns the resolved template as a string.
 */
export function createInput(vars: Dataset['vars'] = [{}], inputTemplate: string): string {
  const view: Record<string, string> = {};

  for (const v of vars) {
    view[v.name] = v.default;
  }

  const template = Handlebars.compile(inputTemplate);
  return template(view);
}
