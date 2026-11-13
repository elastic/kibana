/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Liquid } from 'liquidjs';
import { CUSTOM_CONTENT_LIQUID_OPTIONS } from '@kbn/custom-content-common';

const liquid = new Liquid(CUSTOM_CONTENT_LIQUID_OPTIONS);

/** The reason a template does not parse as Liquid, or undefined when it does. */
export const getLiquidSyntaxError = (template: string): string | undefined => {
  try {
    liquid.parse(template.trim());
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};
