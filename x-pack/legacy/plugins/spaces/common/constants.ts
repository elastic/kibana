/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const DEFAULT_SPACE_ID = `default`;

/**
 * The minimum number of spaces required to show a search control.
 */
export const SPACE_SEARCH_COUNT_THRESHOLD = 8;

/**
 * The maximum number of characters allowed in the Space Avatar's initials
 */
export const MAX_SPACE_INITIALS = 2;

/**
 * The maximum number of characters allowed in the Space Identifier.
 *
 * Elasticsearch restricts the document identifier to 512 bytes.
 * Since the document is stored in ES as `space:${spaceId}`, the max allowed length is (512 - 'space:'.length) = 506.
 * 506 is a really strange number to restrict users to, so opting for 500 instead, which should still be more than enough characters.
 */
export const MAX_SPACE_ID_LENGTH = 500;

/**
 * The type name used within the Monitoring index to publish spaces stats.
 * @type {string}
 */
export const KIBANA_SPACES_STATS_TYPE = 'spaces';
