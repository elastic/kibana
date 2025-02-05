/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SOSecret } from './secret';

export interface NewFleetServerHost {
  name: string;
  host_urls: string[];
  is_default: boolean;
  is_preconfigured: boolean;
  is_internal?: boolean;
  proxy_id?: string | null;
  ssl?: {
    certificate_authorities?: string[];
    certificate?: string;
    key?: string;
    es_certificate_authorities?: string[];
    es_certificate?: string;
    es_key?: string;
  } | null;
  secrets?: {
    ssl?: {
      key?: SOSecret;
      es_key?: SOSecret;
    };
  };
}

export interface FleetServerHost extends NewFleetServerHost {
  id: string;
}
