/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getArtifactName, parseArtifactName } from './src/artifact';
export { type ArtifactManifest } from './src/manifest';
export { DocumentationProduct, type ProductName } from './src/product';
export { isArtifactContentFilePath } from './src/artifact_content';
export {
  productDocIndexPrefix,
  productDocIndexPattern,
  getProductDocIndexName,
} from './src/indices';
export type { ProductDocumentationAttributes } from './src/documents';
