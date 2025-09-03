/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { knowledgeBaseReference } from '.';
import type { ContentReference, DocumentEntry } from '../../schemas';
import type { ContentReferenceBlock, ContentReferenceId, ContentReferencesStore } from '../types';

/**
 * Returns "Arid2" from "{reference(Arid2)}"
 * @param contentReference A ContentReferenceBlock
 * @returns ContentReferenceId
 */
export const getContentReferenceId = (
  contentReferenceBlock: ContentReferenceBlock
): ContentReferenceId => {
  return contentReferenceBlock.replace('{reference(', '').replace(')}', '');
};

/**
 * Returns a contentReferenceBlock for a given ContentReference. A ContentReferenceBlock may be provided
 * to an LLM alongside grounding documents allowing the LLM to reference the documents in its output.
 * @param contentReference A ContentReference
 * @returns ContentReferenceBlock
 */
export const contentReferenceBlock = (
  contentReference: ContentReference | undefined
): ContentReferenceBlock | '' => {
  if (!contentReference) {
    return '';
  }
  return `{reference(${contentReference.id})}`;
};

/**
 * Simplifies passing a contentReferenceBlock alongside grounding documents.
 * @param contentReference A ContentReference
 * @returns the string: `Reference: <contentReferenceBlock>`
 */
export const contentReferenceString = (contentReference: ContentReference | undefined) => {
  if (!contentReference) {
    return '';
  }
  return `Citation: ${contentReferenceBlock(contentReference)}` as const;
};

/**
 * Removed content references from conent.
 * @param content content to remove content references from
 * @returns content with content references replaced with ''
 */
export const removeContentReferences = (content: string) => {
  let result = '';
  let i = 0;

  while (i < content.length) {
    const start = content.indexOf('{reference(', i);
    if (start === -1) {
      // No more "{reference(" → append the rest of the string
      result += content.slice(i);
      break;
    }

    const end = content.indexOf(')}', start);
    if (end === -1) {
      // If no closing ")}" is found, treat the rest as normal text
      result += content.slice(i);
      break;
    }

    // Append everything before "{reference(" and skip the matched part
    result += content.slice(i, start);
    i = end + 2; // Move index past ")}"
  }

  return result;
};

/**
 * Removes content references from chat history
 */
export const sanitizeMessages = (messages: BaseMessage[]): BaseMessage[] => {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) {
      message.content = removeContentReferences(message.content).trim();
    } else {
      message.content = message.content.map((item) => {
        if (item && item.type === 'text' && 'text' in item && typeof item.text === 'string') {
          item.text = removeContentReferences(item.text).trim();
        }
        return item;
      });
    }
    return message;
  });
};

/**
 * Enriches a DocumentEntry with a content reference.
 */
export const enrichDocument = (contentReferencesStore: ContentReferencesStore) => {
  return (document: DocumentEntry): DocumentEntry => {
    if (document.id == null) {
      return document;
    }
    const documentId = document.id;
    const reference = contentReferencesStore.add((p) =>
      knowledgeBaseReference(p.id, document.name, documentId)
    );
    return {
      ...document,
      text: `${contentReferenceString(reference)}\n${document.text}`,
    };
  };
};
