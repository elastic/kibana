/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SOSecret } from './secret';

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
  secrets?: {
    ssl?: {
      key?: SOSecret;
    };
  };
}

export type DownloadSource = DownloadSourceBase & {
  id: string;
};
