/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { newContentReferencesStore } from './content_references_store/content_references_store';
export { pruneContentReferences } from './content_references_store/prune_content_references';
export {
  securityAlertReference,
  knowledgeBaseReference,
  securityAlertsPageReference,
  productDocumentationReference,
  esqlQueryReference,
} from './references';
export {
  contentReferenceString,
  contentReferenceBlock,
  removeContentReferences,
} from './references/utils';
