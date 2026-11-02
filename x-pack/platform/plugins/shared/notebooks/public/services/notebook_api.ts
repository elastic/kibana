/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { NOTEBOOK_API_BASE_PATH } from '../../common/constants';
import type {
  FindNotebooksResponse,
  NotebookAttributes,
  NotebookSavedObject,
} from '../../common/types';

export interface FindNotebooksOptions {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface NotebookApi {
  get: (id: string) => Promise<NotebookSavedObject>;
  create: (attributes: NotebookAttributes) => Promise<NotebookSavedObject>;
  update: (id: string, attributes: NotebookAttributes) => Promise<NotebookSavedObject>;
  delete: (id: string) => Promise<void>;
  find: (options?: FindNotebooksOptions) => Promise<FindNotebooksResponse>;
}

const notebookPath = (id: string): string => `${NOTEBOOK_API_BASE_PATH}/${encodeURIComponent(id)}`;

/** Creates a typed client for the internal notebook saved object routes. */
export const createNotebookApi = (http: HttpStart): NotebookApi => ({
  get: (id) => http.get<NotebookSavedObject>(notebookPath(id)),
  create: (attributes) =>
    http.post<NotebookSavedObject>(NOTEBOOK_API_BASE_PATH, { body: JSON.stringify(attributes) }),
  update: (id, attributes) =>
    http.put<NotebookSavedObject>(notebookPath(id), { body: JSON.stringify(attributes) }),
  delete: async (id) => {
    await http.delete(notebookPath(id));
  },
  find: ({ search, page, perPage } = {}) =>
    http.get<FindNotebooksResponse>(`${NOTEBOOK_API_BASE_PATH}/_find`, {
      query: { search, page, perPage },
    }),
});
