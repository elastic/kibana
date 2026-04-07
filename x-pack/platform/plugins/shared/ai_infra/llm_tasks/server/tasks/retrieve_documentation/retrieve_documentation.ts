/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { FunctionCallingMode, OutputAPI } from '@kbn/inference-common';
import type { ProductDocSearchAPI, DocSearchResult } from '@kbn/product-doc-base-plugin/server';
import { truncate, count as countTokens } from '../../utils/tokens';
import type { RetrieveDocumentationAPI } from './types';
import { summarizeDocument } from './summarize_document';

const MAX_DOCUMENTS_DEFAULT = 3;
const MAX_TOKENS_DEFAULT = 1000;

const applyTokenReductionStrategy = async ({
  tokenReductionStrategy,
  searchTerm,
  outputAPI,
  functionCalling,
  connectorId,
  doc,
  maxDocumentTokens,
}: {
  tokenReductionStrategy: 'highlight' | 'truncate' | 'summarize';
  connectorId: string;
  doc: DocSearchResult;
  searchTerm: string;
  outputAPI: OutputAPI;
  functionCalling?: FunctionCallingMode;
  maxDocumentTokens: number;
}): Promise<string> => {
  let content: string;
  switch (tokenReductionStrategy) {
    case 'highlight':
      content = doc.highlights.join('\n\n');
      break;
    case 'summarize':
      const extractResponse = await summarizeDocument({
        searchTerm,
        documentContent: doc.content,
        outputAPI,
        connectorId,
        functionCalling,
      });
      content = extractResponse.summary;
      break;
    case 'truncate':
      content = doc.content;
      break;
  }
  return truncate(content, maxDocumentTokens);
};

export const retrieveDocumentation =
  ({
    outputAPI,
    searchDocAPI,
    logger: log,
  }: {
    outputAPI: OutputAPI;
    searchDocAPI: ProductDocSearchAPI;
    logger: Logger;
  }): RetrieveDocumentationAPI =>
  async ({
    searchTerm,
    connectorId,
    products,
    resourceTypes,
    functionCalling,
    inferenceId,
    max = MAX_DOCUMENTS_DEFAULT,
    maxDocumentTokens = MAX_TOKENS_DEFAULT,
    tokenReductionStrategy = 'highlight',
  }) => {
    try {
      const highlights =
        tokenReductionStrategy === 'highlight' ? calculateHighlightCount(maxDocumentTokens) : 0;
      const { results } = await searchDocAPI({
        query: searchTerm,
        products,
        ...(resourceTypes ? { resourceTypes } : {}),
        max,
        highlights,
        inferenceId,
      });

      log.debug(`searching with term=[${searchTerm}] returned ${results.length} documents`);

      if (tokenReductionStrategy === 'none') {
        log.debug(
          `tokenReductionStrategy is set to 'none', returning full content even if it exceeds maxDocumentTokens`
        );
        return {
          success: true,
          documents: results.map((document) => ({
            title: document.title,
            url: document.url,
            content: document.content,
            summarized: false,
          })),
        };
      }
      const processedDocuments = await Promise.all(
        results.map(async (document) => {
          const tokenCount = countTokens(document.content);
          const docHasTooManyTokens = tokenCount >= maxDocumentTokens;
          log.debug(
            `processing doc [${document.url}] - tokens : [${tokenCount}] - tooManyTokens: [${docHasTooManyTokens}]`
          );

          let content = document.content;
          if (docHasTooManyTokens) {
            content = await applyTokenReductionStrategy({
              tokenReductionStrategy,
              searchTerm,
              outputAPI,
              functionCalling,
              connectorId,
              doc: document,
              maxDocumentTokens,
            });
          }

          log.debug(`done processing document [${document.url}]`);
          return {
            title: document.title,
            url: document.url,
            content,
            summarized: docHasTooManyTokens,
          };
        })
      );

      log.debug(() => {
        const docsAsJson = JSON.stringify(processedDocuments);
        return `searching with term=[${searchTerm}] - results: ${docsAsJson}`;
      });

      return {
        success: true,
        documents: processedDocuments.filter((doc) => doc.content.length > 0),
      };
    } catch (e) {
      log.error(`Error retrieving documentation: ${e.message}. Returning empty results.`);
      return { success: false, documents: [] };
    }
  };

const AVG_TOKENS_PER_HIGHLIGHT = 250;

const calculateHighlightCount = (maxTokensPerDoc: number): number => {
  return Math.ceil(maxTokensPerDoc / AVG_TOKENS_PER_HIGHLIGHT);
};
