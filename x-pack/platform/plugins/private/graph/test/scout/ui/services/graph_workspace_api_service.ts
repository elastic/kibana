/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

const CM_BASE = '/api/content_management/rpc';
const CONTENT_TYPE_ID = 'graph';
const VERSION = 1;

interface SearchHit {
  id: string;
  attributes?: { title?: string };
}

interface SearchResponse {
  result: {
    result: {
      hits: SearchHit[];
    };
  };
}

/**
 * Helper for managing Graph saved workspaces via the Content Management RPC
 * endpoint. Used in `afterAll` hooks as a safety net so that a test failure
 * mid-flow doesn't leak workspaces into the cluster.
 */
export interface GraphWorkspaceApiService {
  /** Delete a workspace by saved-object id. Idempotent (404 is ignored). */
  delete: (id: string) => Promise<void>;
  /** List all graph workspaces (returns id + title). */
  list: () => Promise<Array<{ id: string; title: string | undefined }>>;
  /** Delete any workspace whose title matches the predicate. */
  deleteByTitle: (title: string) => Promise<void>;
  /** Wipe every graph workspace. Use for full test-suite isolation. */
  cleanAll: () => Promise<void>;
}

export function getGraphWorkspaceApiService(kbnClient: KbnClient): GraphWorkspaceApiService {
  const deleteOne = async (id: string) => {
    await kbnClient.request({
      method: 'POST',
      path: `${CM_BASE}/delete`,
      body: { contentTypeId: CONTENT_TYPE_ID, id, version: VERSION },
      ignoreErrors: [404],
    });
  };

  const list = async () => {
    const response = await kbnClient.request<SearchResponse>({
      method: 'POST',
      path: `${CM_BASE}/search`,
      body: { contentTypeId: CONTENT_TYPE_ID, version: VERSION, query: {} },
    });
    return (response.data.result.result.hits ?? []).map((hit) => ({
      id: hit.id,
      title: hit.attributes?.title,
    }));
  };

  return {
    delete: deleteOne,
    list,
    deleteByTitle: async (title: string) => {
      const hits = await list();
      await Promise.all(hits.filter((hit) => hit.title === title).map((hit) => deleteOne(hit.id)));
    },
    cleanAll: async () => {
      const hits = await list();
      await Promise.all(hits.map((hit) => deleteOne(hit.id)));
    },
  };
}
