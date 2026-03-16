/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TypeScript types derived from the Beats filestream input Go config:
 * https://github.com/elastic/beats/blob/main/filebeat/input/filestream/config.go
 */

export interface FilestreamBackoffConfig {
  init?: string;
  max?: string;
}

export interface FilestreamReaderConfig {
  backoff?: FilestreamBackoffConfig;
  buffer_size?: number;
  encoding?: string;
  exclude_lines?: string[];
  include_lines?: string[];
  line_terminator?:
    | 'auto'
    | 'line_feed'
    | 'vertical_tab'
    | 'form_feed'
    | 'carriage_return'
    | 'carriage_return_line_feed'
    | 'next_line'
    | 'line_separator'
    | 'paragraph_separator'
    | 'null_terminator';
  message_max_bytes?: number;
  seek_to_tail?: boolean;
  parsers?: Array<Record<string, unknown>>;
}

export interface FilestreamScannerConfig {
  recursive_glob?: boolean;
  symlinks?: boolean;
  include_files?: string[];
  exclude_files?: string[];
  resend_on_touch?: boolean;
  check_interval?: string;
  fingerprint?: {
    enabled?: boolean;
    offset?: number;
    length?: number;
  };
}

export interface FilestreamStateChangeCloserConfig {
  check_interval?: string;
  inactive?: string;
  removed?: boolean;
  renamed?: boolean;
}

export interface FilestreamReaderCloserConfig {
  after_interval?: string;
  on_eof?: boolean;
}

export interface FilestreamCloserConfig {
  on_state_change?: FilestreamStateChangeCloserConfig;
  reader?: FilestreamReaderCloserConfig;
}

export interface FilestreamFileIdentityConfig {
  native?: null;
  path?: string;
  inode_marker?: {
    path?: string;
  };
  fingerprint?: null;
}

export interface FilestreamCopyTruncateConfig {
  suffix_regex?: string;
  dateformat?: string;
}

export interface FilestreamRotationConfig {
  external?: {
    strategy?: {
      copytruncate?: FilestreamCopyTruncateConfig;
    };
  };
}

export interface FilestreamDeleterConfig {
  enabled?: boolean;
  grace_period?: string;
}

export interface FilestreamTakeOverConfig {
  enabled?: boolean;
}

/**
 * Top-level filestream input configuration.
 *
 * Maps to the `config` struct in:
 * https://github.com/elastic/beats/blob/main/filebeat/input/filestream/config.go
 */
export interface FilestreamInputConfig extends FilestreamReaderConfig {
  id?: string;
  paths: string[];
  close?: FilestreamCloserConfig;
  prospector?: {
    scanner?: FilestreamScannerConfig;
  };
  file_identity?: FilestreamFileIdentityConfig;
  compression?: '' | 'gzip' | 'auto';
  include_file_owner_name?: boolean;
  include_file_owner_group_name?: boolean;
  clean_inactive?: string;
  clean_removed?: boolean;
  harvester_limit?: number;
  ignore_older?: string;
  ignore_inactive?: 'since_first_start' | 'since_last_start' | '';
  rotation?: FilestreamRotationConfig;
  delete?: FilestreamDeleterConfig;
  take_over?: FilestreamTakeOverConfig;

  tags?: string[];
  processors?: Array<Record<string, unknown>>;
  preserve_original_event?: boolean;
}
