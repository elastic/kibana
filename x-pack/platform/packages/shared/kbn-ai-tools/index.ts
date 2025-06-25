/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { describeDataset } from './src/tools/describe_dataset';
export { getSampleDocuments } from './src/tools/describe_dataset/get_sample_documents';
export type {
  DocumentAnalysis,
  TruncatedDocumentAnalysis,
} from './src/tools/describe_dataset/document_analysis';
export { mergeSampleDocumentsWithFieldCaps } from './src/tools/describe_dataset/merge_sample_documents_with_field_caps';
export { sortAndTruncateAnalyzedFields } from './src/tools/describe_dataset/sort_and_truncate_analyzed_fields';

export { answerAsEsqlExpert } from './src/tools/esql';
