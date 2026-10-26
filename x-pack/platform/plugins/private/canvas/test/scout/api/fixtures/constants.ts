/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const MULTIPART_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
} as const;

export const KBN_ARCHIVES = {
  DEFAULT: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/default',
  REPORTS: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/reports',
};

export const WORKPAD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31';

/** The "The Very Cool Workpad for PDF Tests" saved in the reports KBN archive. */
export const REPORTS_WORKPAD_ID = 'workpad-c13808dc-e690-4bab-be06-2073ba071754';
export const REPORTS_WORKPAD_NAME = 'The Very Cool Workpad for PDF Tests';

/**
 * A user with canvas:all + logstash-* read (the "canvas editor" role).
 */
export const CANVAS_ALL_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { canvas: ['all'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with canvas:read + logstash-* read (the "canvas viewer" role).
 */
export const CANVAS_READ_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { canvas: ['read'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with no canvas privileges — only discover:all.
 * Mirrors the FTR `no_canvas_privileges_role` to ensure the user
 * has some Kibana access so failures are not attributed to "no UI at all".
 */
export const NO_CANVAS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { discover: ['all'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with canvas:read + canvas:generate_report — the minimum for PDF report generation.
 * Mirrors the FTR `test_canvas_user` role (no ES index access needed).
 */
export const CANVAS_REPORT_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [],
  },
  kibana: [
    {
      base: [],
      feature: { canvas: ['read', 'generate_report'] },
      spaces: ['*'],
    },
  ],
};

export interface CanvasCapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  canvas: { show: boolean; save: boolean };
}
