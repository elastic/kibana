/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';

// Canvas only runs in stateful deployments (disabled in serverless via config/serverless.yml)
export const CANVAS_TAGS = [...tags.stateful.classic];

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
} as const;

export const MULTIPART_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
} as const;

export const KBN_ARCHIVES = {
  DEFAULT: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/default',
};

export const WORKPAD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31';

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

export interface CanvasCapabilitiesResponse {
  navLinks: Record<string, boolean>;
  catalogue: Record<string, boolean>;
  canvas: { show: boolean; save: boolean };
}
