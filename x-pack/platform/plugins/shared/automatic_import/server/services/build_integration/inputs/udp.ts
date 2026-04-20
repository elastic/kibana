/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats UDP input Go config:
 * https://github.com/elastic/beats/blob/main/filebeat/inputsource/udp/config.go
 * https://github.com/elastic/beats/blob/main/filebeat/input/net/udp/input.go
 */

export interface UdpInputConfig {
  host: string;
  max_message_size?: number;
  timeout?: string;
  read_buffer?: number;
  network?: 'udp' | 'udp4' | 'udp6';

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
