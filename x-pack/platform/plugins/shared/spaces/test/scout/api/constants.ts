/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Repo-relative path (directory) of the shared spaces ES archive used by the
 * `disable_legacy_url_aliases`, `get_shareable_references` and
 * `update_objects_spaces` suites. The archive contains raw saved object documents
 * (multi-namespace shares, `originId`s, `legacy-url-alias` docs) that cannot be
 * produced through the saved objects HTTP APIs, so it is seeded into the existing
 * `.kibana*` indices by the plugin-local `common/es_archive` helper.
 */
export const SPACES_ES_ARCHIVE =
  'x-pack/platform/plugins/shared/spaces/test/scout/api/fixtures/es_archiver/saved_objects/spaces';

export const SPACES = {
  DEFAULT: {
    spaceId: 'default',
    name: 'Default',
    description: 'This is the default space',
    disabledFeatures: [],
  },
  SPACE_1: {
    spaceId: 'space_1',
    name: 'Space 1',
    description: 'This is the first test space',
    disabledFeatures: [],
  },
  SPACE_2: {
    spaceId: 'space_2',
    name: 'Space 2',
    description: 'This is the second test space',
    disabledFeatures: [],
  },
} as const;

export const ATTRIBUTE_TITLE_KEY = 'title';
export const ATTRIBUTE_TITLE_VALUE = `Test Dashboard`;

export const TEST_SPACES = [SPACES.DEFAULT, SPACES.SPACE_1] as const;

export const DASHBOARD_SAVED_OBJECT = {
  type: 'dashboard',
  attributes: { [ATTRIBUTE_TITLE_KEY]: ATTRIBUTE_TITLE_VALUE },
};

export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
};

export const COMMON_HEADERS_NO_INTERNAL = {
  'kbn-xsrf': 'some-xsrf-token',
};
