/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { encode } from 'gpt-tokenizer';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ExtractedDocument } from './extract_documentation';

export const processDocuments = async ({
  documents,
  log,
}: {
  documents: ExtractedDocument[];
  log: ToolingLog;
}): Promise<ExtractedDocument[]> => {
  log.info('Starting processing documents.');
  const initialCount = documents.length;
  documents = removeDuplicates(documents);
  const noDupCount = documents.length;
  log.info(`Removed ${initialCount - noDupCount} duplicates`);
  documents.forEach(processDocument);
  documents = filterEmptyDocs(documents);
  log.info(`Removed ${noDupCount - documents.length} empty documents`);
  log.info('Done processing documents.');
  return documents;
};

const removeDuplicates = (documents: ExtractedDocument[]): ExtractedDocument[] => {
  return uniqBy(documents, (doc) => doc.slug);
};

/**
 * Filter "this content has moved" or "deleted pages" type of documents, just based on token count.
 */
const filterEmptyDocs = (documents: ExtractedDocument[]): ExtractedDocument[] => {
  return documents.filter((doc) => {
    const tokenCount = encode(doc.content_body).length;
    if (tokenCount < 100) {
      return false;
    }
    return true;
  });
};

const processDocument = (document: ExtractedDocument) => {
  document.content_body = document.content_body
    // remove those "edit" button text that got embedded into titles.
    .replaceAll(/([a-zA-Z])edit\n/g, (match) => {
      return `${match[0]}\n`;
    })
    // limit to 2 consecutive carriage return
    .replaceAll(/\n\n+/g, '\n\n');

  return document;
};
