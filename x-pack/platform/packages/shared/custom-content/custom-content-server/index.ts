/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  CustomContentTemplateResolverDeps,
  ResolvedCustomContentTemplate,
} from './src/custom_content_resolver';
export {
  createCustomContentTemplateResolver,
  extractDeclaredHeight,
} from './src/custom_content_resolver';
export { sanitizeCellValue } from './src/sanitize_cell_value';
