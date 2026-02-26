/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats http_endpoint input Go config:
 * https://github.com/elastic/beats/blob/main/x-pack/filebeat/input/http_endpoint/config.go
 */

export interface HttpEndpointTlsConfig {
  enabled?: boolean;
  certificate?: string;
  key?: string;
  certificate_authorities?: string[];
  verification_mode?: string;
}

export interface HttpEndpointTracerConfig {
  enabled?: boolean;
  filename?: string;
  max_size?: number;
  max_age?: number;
  max_backups?: number;
  local_time?: boolean;
  compress?: boolean;
}

export interface HttpEndpointInputConfig {
  method?: 'POST' | 'PUT' | 'PATCH';
  ssl?: HttpEndpointTlsConfig;
  basic_auth?: boolean;
  username?: string;
  password?: string;
  response_code?: number;
  response_body?: string;
  options_headers?: Record<string, string | string[]>;
  options_response_code?: number;
  listen_address?: string;
  listen_port?: string;
  url: string;
  prefix?: string;
  content_type?: string;
  max_body_bytes?: number;
  max_in_flight_bytes?: number;
  high_water_in_flight_bytes?: number;
  low_water_in_flight_bytes?: number;
  retry_after?: number;
  program?: string;
  secret?: {
    header?: string;
    value?: string;
  };
  hmac?: {
    header?: string;
    key?: string;
    type?: 'sha1' | 'sha256';
    prefix?: string;
  };
  crc?: {
    provider?: string;
    secret?: string;
  };
  include_headers?: string[];
  preserve_original_event?: boolean;
  tracer?: HttpEndpointTracerConfig;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
}
