/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';

import { createSpace, deleteSpace, SPACE_1, SPACE_2 } from './spaces';

const FIXTURE_DIR = 'x-pack/platform/plugins/shared/spaces/test/scout/api/fixtures/kbn_archiver';

/**
 * Copy-to-space saved-object archives. Each archive is imported into its space
 * ({@link null} = default), then a subset of the objects is shared to additional spaces.
 */
const SPACE_DATA: Array<{ space?: string; dataUrl: string }> = [
  { space: undefined, dataUrl: `${FIXTURE_DIR}/default_space.json` },
  { space: SPACE_1.id, dataUrl: `${FIXTURE_DIR}/space_1.json` },
  { space: SPACE_2.id, dataUrl: `${FIXTURE_DIR}/space_2.json` },
];

/**
 * Objects can only be imported into one space at a time, so shared test objects are
 * imported into their "origin" space first and then shared to other spaces here.
 */
const OBJECTS_TO_SHARE: Array<{
  spacesToAdd?: string[];
  spacesToRemove?: string[];
  objects: Array<{ type: string; id: string }>;
}> = [
  {
    spacesToAdd: ['*'],
    spacesToRemove: ['default'],
    objects: [
      { type: 'event-annotation-group', id: 'all_spaces' },
      { type: 'event-annotation-group', id: 'space_2_only_matching_origin' },
      { type: 'event-annotation-group', id: 'alias_delete_exclusive' },
    ],
  },
  {
    spacesToRemove: ['default'],
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [{ type: 'event-annotation-group', id: 'space_1_and_space_2' }],
  },
  {
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    objects: [
      { type: 'event-annotation-group', id: 'each_space' },
      { type: 'event-annotation-group', id: 'conflict_2_all' },
      { type: 'event-annotation-group', id: 'alias_delete_inclusive' },
    ],
  },
  {
    spacesToAdd: [SPACE_1.id],
    objects: [
      { type: 'event-annotation-group', id: 'conflict_1c_default_and_space_1' },
      { type: 'event-annotation-group', id: 'default_and_space_1' },
    ],
  },
  {
    spacesToAdd: [SPACE_2.id],
    objects: [{ type: 'event-annotation-group', id: 'default_and_space_2' }],
  },
  {
    spacesToAdd: [SPACE_1.id, SPACE_2.id],
    // No-op: `resolvetype` is not a registered saved object type in this deployment and no
    // fixture creates `conflict-newid`, so `_update_objects_spaces` reports a per-object
    // not-found that the loader does not inspect.
    objects: [{ type: 'resolvetype', id: 'conflict-newid' }],
  },
];

/**
 * Transient namespace written to by the authorized `nonExistentSpace` test cases (a copy
 * into a space that has no `space` object). Cleaned up alongside the real spaces below.
 */
const NON_EXISTENT_SPACE_ID = 'non_existent_space';

/**
 * Provisions `space_1` and `space_2` (the copy destinations).
 */
export const createCopySpaces = async (kbnClient: KbnClient) => {
  await createSpace(kbnClient, SPACE_1);
  await createSpace(kbnClient, SPACE_2);
};

export const deleteCopySpaces = async (kbnClient: KbnClient) => {
  await deleteSpace(kbnClient, SPACE_1.id);
  await deleteSpace(kbnClient, SPACE_2.id);
};

/**
 * Imports the copy-to-space archives into their spaces and shares the multi-namespace
 * objects.
 */
export const createCopySavedObjects = async (kbnClient: KbnClient) => {
  // The three archives target distinct spaces with disjoint document ids, and the shares
  // operate on disjoint object sets that only depend on the imports having completed —
  // so each stage runs in parallel. This hook runs before every test in the copy/resolve
  // matrices (~476 tests), so the latency matters.
  await Promise.all(
    SPACE_DATA.map(({ space, dataUrl }) =>
      kbnClient.importExport.load(dataUrl, space ? { space } : undefined)
    )
  );

  await Promise.all(
    OBJECTS_TO_SHARE.map(({ objects, spacesToAdd = [], spacesToRemove = [] }) =>
      kbnClient.request({
        method: 'POST',
        path: '/api/spaces/_update_objects_spaces',
        body: { objects, spacesToAdd, spacesToRemove },
      })
    )
  );
};

/**
 * Removes all copy-to-space saved objects from every space (including the transient
 * `non_existent_space` used by the non-existent-space test cases).
 */
export const deleteCopySavedObjects = async (kbnClient: KbnClient) => {
  const { data: spaces } = await kbnClient.request<Array<{ id: string }>>({
    method: 'GET',
    path: '/api/spaces/space',
  });
  const spaceIds = [...spaces.map((space) => space.id), NON_EXISTENT_SPACE_ID];

  // Per-space cleanups touch disjoint namespaces, so they run in parallel; within a
  // space the two calls stay sequential.
  await Promise.all(
    spaceIds.map(async (space) => {
      await kbnClient.savedObjects.cleanStandardList({ space });
      await kbnClient.savedObjects.clean({ space, types: ['event-annotation-group', 'url'] });
    })
  );
};
