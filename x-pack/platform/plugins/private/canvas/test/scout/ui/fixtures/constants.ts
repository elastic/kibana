/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRole } from '@kbn/scout';

const SCOUT_FIXTURES = 'x-pack/platform/plugins/private/canvas/test/scout/ui/fixtures';

export const KBN_ARCHIVES = {
  DEFAULT: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/default',
  FILTER: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/filter',
  // Scout-only copy of the FTR `canvas/lens` archive; its data view + viz reference the
  // `canvas_lens` index (see ES_ARCHIVES.CANVAS_LENS).
  LENS: `${SCOUT_FIXTURES}/kbn_archives/canvas_lens`,
  REPORTS: 'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/reports',
  SAVED_OBJECT_RESOLVE:
    'x-pack/platform/test/functional/fixtures/kbn_archives/canvas/saved_object_resolve',
  DASHBOARD: 'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana',
  LEGACY_DATA_VIEWS: 'src/platform/test/functional/fixtures/kbn_archiver/legacy.json',
};

export const ES_ARCHIVES = {
  LOGSTASH: 'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  // Scout-only copy of the FTR `canvas/logstash_lens` archive, renamed to index `canvas_lens`.
  // The original `logstash-lens` maps `bytes` as `float`, colliding with `logstash_functional`'s
  // `long` under the `logstash*` wildcard that Canvas `essql` panels query. The rename keeps the
  // ingested data harmless to other specs (Scout only ingests, never deletes).
  CANVAS_LENS: `${SCOUT_FIXTURES}/es_archives/canvas_lens`,
};

/** The "Test Workpad" saved in the default KBN archive. */
export const TEST_WORKPAD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31';
export const TEST_WORKPAD_NAME = 'Test Workpad';

/** The "Filter Debug Workpad" saved in the filter KBN archive. */
export const FILTER_WORKPAD_ID = 'workpad-b5618217-56d2-47fa-b756-1be2306cda68';

/** The "The Very Cool Workpad for PDF Tests" saved in the reports KBN archive. */
export const REPORTS_WORKPAD_NAME = 'The Very Cool Workpad for PDF Tests';
export const REPORTS_WORKPAD_ID = 'workpad-c13808dc-e690-4bab-be06-2073ba071754';

/**
 * By-reference embeddables used by the Canvas embeddable specs.
 * `libraryName` is the dashed name shown in the "Add from library" finder;
 * `headingId` is the space-stripped title rendered as `embeddablePanelHeading-<id>`.
 */
export const EMBEDDABLES = {
  SAVED_SEARCH: {
    libraryName: 'Rendering-Test:-saved-search',
    headingId: 'RenderingTest:savedsearch',
  },
  VISUALIZATION: {
    libraryName: 'Rendering-Test: metric',
    headingId: 'RenderingTest:metric',
  },
  LENS: {
    libraryName: 'Artistpreviouslyknownaslens',
    headingId: 'Artistpreviouslyknownaslens',
  },
} as const;

/** Expected legacy-metric label/value rendered by the saved Lens visualization. */
export const LENS_METRIC = { label: 'Maximum of bytes', value: '16,788' } as const;

/**
 * Absolute time range covering the Lens (`canvas_lens`) and `logstash_functional` data, so the
 * Lens editor shows data instead of the "this time range doesn't contain any data" popover.
 */
export const LOGSTASH_TIME_RANGE = {
  from: 'Sep 19, 2015 @ 06:31:44.000',
  to: 'Sep 23, 2015 @ 18:31:44.000',
} as const;

/**
 * Workpad IDs for saved_object_resolve scenarios.
 * These are the IDs of workpads in the saved_object_resolve KBN archive
 * set up with legacy-url-alias redirects for alias + conflict resolution testing.
 */
export const RESOLVE_OLD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-old-id';
export const RESOLVE_NEW_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-new-id';
export const RESOLVE_CONFLICT_OLD_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-old';
export const RESOLVE_CONFLICT_NEW_ID = 'workpad-1705f884-6224-47de-ba49-ca224fe6ec31-conflict-new';

/**
 * ES index grant shared by the Canvas roles. The pattern is `logstash*` (not `logstash-*`):
 * Canvas's `essql` element queries `FROM "logstash*"` and the ES SQL API authorizes the
 * requested wildcard against the grant, so `logstash-*` would not cover it and the panel fails.
 */
const LOGSTASH_READ_INDICES = [
  { names: ['logstash*'], privileges: ['read', 'view_index_metadata'] },
];

/**
 * A user with canvas:all + logstash* read (the "canvas editor" role).
 * Used for flows that require workpad editing.
 */
export const CANVAS_EDITOR_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: LOGSTASH_READ_INDICES,
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
 * A user with canvas:read + logstash* read (the "canvas viewer" role).
 * Used for read-only flows (smoke, filters, saved_object_resolve).
 */
export const CANVAS_VIEWER_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: LOGSTASH_READ_INDICES,
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
 * A user with canvas:all + maps:all + logstash* read.
 * Used for the maps embeddable test.
 */
export const CANVAS_MAPS_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: LOGSTASH_READ_INDICES,
  },
  kibana: [
    {
      base: [],
      feature: { canvas: ['all'], maps: ['all'], indexPatterns: ['all'] },
      spaces: ['*'],
    },
  ],
};

/**
 * A user with canvas:all + discover:all + visualize:all + dashboard:all + logstash* read.
 * Also grants read on `canvas_lens` (the Scout-only Lens index — see ES_ARCHIVES.CANVAS_LENS):
 * without it Kibana's `field_caps` call is denied and the Lens data view resolves no fields.
 * Used for the lens, saved_search, and visualization embeddable tests.
 */
export const CANVAS_FULL_EDITOR_ROLE: KibanaRole = {
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logstash*', 'canvas_lens', '.kibana*'],
        privileges: ['read', 'view_index_metadata'],
      },
    ],
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
