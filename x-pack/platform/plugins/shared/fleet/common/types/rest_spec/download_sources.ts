/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DownloadSourceBase, DownloadSource, DownloadSourceSecrets } from '../models';

import type { ListResult } from './common';

export interface GetOneDownloadSourceResponse {
  item: DownloadSource;
}

export interface DeleteDownloadSourceResponse {
  id: string;
}

export interface GetOneDownloadSourceRequest {
  params: {
    outputId: string;
  };
}

export interface PutDownloadSourceRequest {
  params: {
    outputId: string;
  };
  body: {
    name: string;
    host: string;
    is_default?: boolean;
    ssl?: {
      certificate_authorities?: string[];
      certificate?: string;
      key?: string;
    };
    auth?: {
      username?: string;
      password?: string;
      api_key?: string;
      headers?: Array<{ key: string; value: string }>;
    } | null;
    secrets?: DownloadSourceSecrets;
  };
}

export interface PostDownloadSourceRequest {
  body: {
    id?: string;
    name: string;
    host: string;
    is_default?: boolean;
    proxy_id?: string | null;
    ssl?: {
      certificate_authorities?: string[];
      certificate?: string;
      key?: string;
    };
    auth?: {
      username?: string;
      password?: string;
      api_key?: string;
      headers?: Array<{ key: string; value: string }>;
    } | null;
    secrets?: DownloadSourceSecrets;
  };
}

export interface PutDownloadSourceResponse {
  item: DownloadSourceBase;
}

export type GetDownloadSourceResponse = ListResult<DownloadSource>;
