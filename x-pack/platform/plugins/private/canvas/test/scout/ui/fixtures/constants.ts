/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KibanaRole } from '@kbn/scout';

// Canvas only runs in stateful deployments (disabled in serverless via config/serverless.yml)
export const CANVAS_UI_TAGS = [...tags.stateful.classic];

export const KBN_ARCHIVES = {
  DEFAULT: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/default',
  FILTER: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/filter',
  LENS: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/lens',
  REPORTS: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/reports',
  SAVED_OBJECT_RESOLVE:
    'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/saved_object_resolve',
  SPACES_DISABLED_FEATURES:
    'x-pack/platform/test/functional/fixtures/kbn_archives/spaces/disabled_features',
  DASHBOARD: 'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana',
  FLIGHTS_INDEX_PATTERN:
    'src/platform/test/functional/fixtures/kbn_archiver/kibana_sample_data_flights_index_pattern.json',
  LEGACY_DATA_VIEWS: 'src/platform/test/functional/fixtures/kbn_archiver/legacy.json',
};

export const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  LOGSTASH_LENS: 'x-pack/platform/test/fixtures/es_archives/canvas/logstash_lens',
  FLIGHTS: 'src/platform/test/functional/fixtures/es_archiver/kibana_sample_data_flights',
};

/** The "Test Workpad" saved in the default KBN archive. */
export const TEST_WORKPAD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31';
export const TEST_WORKPAD_NAME = 'Test Workpad';

/** The "Filter Debug Workpad" saved in the filter KBN archive. */
export const FILTER_WORKPAD_NAME = 'Filter Debug Workpad';
export const FILTER_WORKPAD_ID = 'workpad-b5618217-56d2-47fa-b756-1be2306cda68';

/** The "The Very Cool Workpad for PDF Tests" saved in the reports KBN archive. */
export const REPORTS_WORKPAD_NAME = 'The Very Cool Workpad for PDF Tests';

/**
 * Workpad IDs for saved_object_resolve scenarios.
 * These are the IDs of workpads in the saved_object_resolve KBN archive
 * set up with legacy-url-alias redirects for alias + conflict resolution testing.
 */
export const RESOLVE_OLD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id';
export const RESOLVE_NEW_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-new-id';
export const RESOLVE_CONFLICT_OLD_ID =
  'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old';
export const RESOLVE_CONFLICT_NEW_ID =
  'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-new';

/**
 * A user with canvas:all + logstash-* read (the "canvas editor" role).
 * Used for flows that require workpad editing.
 */
export const CANVAS_EDITOR_ROLE: KibanaRole = {
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
 * Used for read-only flows (smoke, filters, saved_object_resolve).
 */
export const CANVAS_VIEWER_ROLE: KibanaRole = {
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
 * A user with canvas:all + maps:all + logstash-* read.
 * Used for the maps embeddable test.
 */
export const CANVAS_MAPS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: { canvas: ['all'], maps: ['all'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with canvas:all + discover:all + visualize:all + dashboard:all + logstash-* read.
 * Used for the saved_search and visualization embeddable tests.
 */
export const CANVAS_FULL_EDITOR_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logstash-*', '.kibana*'], privileges: ['read', 'view_index_metadata'] }],
  },
  kibana: [
    {
      base: [],
      feature: {
        canvas: ['all'],
        discover: ['all'],
        dashboard: ['all'],
        visualize: ['all'],
        indexPatterns: ['all'],
      },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with canvas:read + canvas:generate_report for PDF report generation.
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

/**
 * A user with no canvas privileges — only discover:all.
 * Mirrors the FTR `no_canvas_privileges_role` to ensure the user
 * has some Kibana access so failures are not attributed to "no UI at all".
 */
export const NO_CANVAS_PRIVILEGES_ROLE: KibanaRole = {
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
