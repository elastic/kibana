/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseSSLSecrets, SOSecret } from './secret';

export interface DownloadSourceSecrets extends BaseSSLSecrets {
  auth?: {
    password?: SOSecret;
    api_key?: SOSecret;
  };
}

export interface DownloadSourceBase {
  name: string;
  host: string;
  is_default: boolean;
  proxy_id?: string | null;
  ssl?: {
    certificate_authorities?: string[];
    certificate?: string;
    key?: string;
  };
  auth?: {
    headers?: Array<{
      key: string;
      value: string;
    }>;
    username?: string;
    password?: string;
    api_key?: string;
  };
  secrets?: DownloadSourceSecrets;
}

export type DownloadSource = DownloadSourceBase & {
  id: string;
};
