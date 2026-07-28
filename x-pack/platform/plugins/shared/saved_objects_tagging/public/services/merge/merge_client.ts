/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type {
  MergePreviewRequest,
  MergePreviewResponse,
  MergePreviewObjectsResponse,
  MergeStartRequest,
  MergeStatusResponse,
} from '../../../common/merge';

const BASE_PATH = '/internal/saved_objects_tagging/tags/merge';

export interface IMergeClient {
  preview(request: MergePreviewRequest): Promise<MergePreviewResponse>;
  previewObjects(
    request: MergePreviewRequest & { page: number; perPage: number }
  ): Promise<MergePreviewObjectsResponse>;
  start(request: MergeStartRequest): Promise<void>;
  status(): Promise<MergeStatusResponse>;
  cancel(): Promise<void>;
}

export class MergeClient implements IMergeClient {
  constructor(private readonly http: HttpSetup) {}

  public preview(request: MergePreviewRequest) {
    return this.http.post<MergePreviewResponse>(`${BASE_PATH}/preview`, {
      body: JSON.stringify(request),
    });
  }

  public previewObjects({
    toId,
    fromIds,
    page,
    perPage,
  }: MergePreviewRequest & { page: number; perPage: number }) {
    return this.http.get<MergePreviewObjectsResponse>(`${BASE_PATH}/preview/objects`, {
      query: { toId, fromIds, page, perPage },
    });
  }

  public async start(request: MergeStartRequest) {
    await this.http.post<{}>(BASE_PATH, { body: JSON.stringify(request) });
  }

  public status() {
    return this.http.get<MergeStatusResponse>(BASE_PATH);
  }

  public async cancel() {
    await this.http.post<{}>(`${BASE_PATH}/cancel`);
  }
}
