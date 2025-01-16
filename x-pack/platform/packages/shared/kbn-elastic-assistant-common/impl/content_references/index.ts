/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { contentReferencesStoreFactory, prunedContentReferences } from './content_references_store';
export {
  alertReferenceFactory,
  knowledgeBaseReferenceFactory,
  alertsPageReferenceFactory,
  productDocumentationReferenceFactory,
  esqlQueryReferenceFactory,
} from './references';
export {
  contentReferenceString,
  contentReferenceBlock,
  removeContentReferences,
} from './references/utils';
