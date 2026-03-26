/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats TCP input Go config:
 * https://github.com/elastic/beats/blob/main/filebeat/inputsource/tcp/config.go
 * https://github.com/elastic/beats/blob/main/filebeat/input/net/tcp/input.go
 */

export interface TcpTlsConfig {
  enabled?: boolean;
  certificate?: string;
  key?: string;
  certificate_authorities?: string[];
  client_authentication?: 'none' | 'optional' | 'required';
  verification_mode?: string;
}

export interface TcpInputConfig {
  host: string;
  timeout?: string;
  max_message_size?: number;
  max_connections?: number;
  ssl?: TcpTlsConfig;
  network?: 'tcp' | 'tcp4' | 'tcp6';
  line_delimiter?: string;
  framing?: 'delimiter' | 'rfc6587';

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
