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

const EMPTY_DOC_TOKEN_LIMIT = 120;

/**
 * Filter "this content has moved" or "deleted pages" type of documents, just based on token count.
 */
const filterEmptyDocs = (documents: ExtractedDocument[]): ExtractedDocument[] => {
  return documents.filter((doc) => {
    const tokenCount = encode(doc.content_body).length;
    if (tokenCount < EMPTY_DOC_TOKEN_LIMIT) {
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
    // remove edit links
    .replaceAll(/\[\s*edit\s*\]\(\s*[^)]+\s*\)/g, '')
    // // remove empty links
    .replaceAll('[]()', '')
    // remove image links
    .replaceAll(/\[\]\(\s*[^)]+\s*\)/g, '')
    // limit to 2 consecutive carriage return
    .replaceAll(/\n\n+/g, '\n\n');

  document.content_title = document.content_title.split('|')[0].trim();

  // specific to security: remove rule query section as it's usually large without much value for the LLM
  if (document.product_name === 'security') {
    const ruleQueryTitle = '### Rule query';
    const ruleQueryPos = document.content_body.indexOf(ruleQueryTitle);
    if (ruleQueryPos > -1) {
      document.content_body = document.content_body.substring(0, ruleQueryPos);
    }
  }

  return document;
};
