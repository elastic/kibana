/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SmlResolver, SmlResolverItem } from './types';

export const ES_DOCUMENT_RESOLVER_TYPE = 'es_document';

/**
 * Split an `es_document` resolver path of the form `<index>/<doc_id>` into
 * its components. Only the FIRST `/` acts as a separator; doc ids may
 * contain `/` characters and are treated as opaque past the first split.
 */
export const parseEsDocumentResolverPath = (
  originPath: string
): { index: string; docId: string } => {
  const sep = originPath.indexOf('/');
  if (sep <= 0 || sep === originPath.length - 1) {
    throw new Error(
      `Invalid es_document resolver path '${originPath}': expected '<index>/<document_id>'`
    );
  }
  return {
    index: originPath.slice(0, sep),
    docId: originPath.slice(sep + 1),
  };
};

/**
 * Built-in resolver for Elasticsearch documents.
 *
 * `origin_id` form: `es_document://<index>/<document_id>`.
 *
 * Permissions: a single ES index-level `read` privilege on the document's
 * index, encoded as `es-index:<index>:read` so the SML security check can
 * dispatch it to Elasticsearch (vs. Kibana) at search time.
 *
 * The item is fetched via the request-scoped ES client (`asCurrentUser`)
 * so document-level security (DLS) and field-level security (FLS) settings
 * are honoured.
 */
export const createEsDocumentResolver = (): SmlResolver => ({
  type: ES_DOCUMENT_RESOLVER_TYPE,

  getPermissions: (originPath) => {
    const { index } = parseEsDocumentResolverPath(originPath);
    return [`es-index:${index}:read`];
  },

  getItem: async (
    originPath,
    context
  ): Promise<SmlResolverItem<{ index: string; id: string; document: unknown }> | undefined> => {
    const { index, docId } = parseEsDocumentResolverPath(originPath);
    try {
      const response = await context.esClient.asCurrentUser.get({ index, id: docId });
      if (!response.found) {
        return undefined;
      }
      return {
        type: ES_DOCUMENT_RESOLVER_TYPE,
        path: originPath,
        data: {
          index: response._index,
          id: response._id,
          document: response._source,
        },
      };
    } catch (error) {
      context.logger.debug(
        `es_document resolver: failed to read document '${index}/${docId}': ${
          (error as Error).message
        }`
      );
      return undefined;
    }
  },
});
