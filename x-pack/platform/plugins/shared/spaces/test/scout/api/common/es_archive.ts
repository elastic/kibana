/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { readFileSync } from 'fs';
import { join } from 'path';

import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import { REPO_ROOT } from '@kbn/repo-info';
import { createEsClientForTesting } from '@kbn/test-es-server';

const systemIndicesSuperuser = {
  username: SYSTEM_INDICES_SUPERUSER,
  password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
};

interface ArchiveDoc {
  id: string;
  index: string;
  source: Record<string, any>;
}

/**
 * Reads/writes to the `.kibana*` system indices are rejected for the regular `elastic`
 * superuser (restricted indices). Scout's default `esClient` authenticates as `elastic`,
 * so we build a dedicated client authenticated as the `system_indices_superuser` user
 * (whose role carries `allow_restricted_indices: true`) for any operation that must touch
 * the system indices directly.
 *
 * NOTE: this is a plugin-local helper on purpose — a first-class system-indices archive
 * capability belongs in `@kbn/scout` and is expected to land there separately, at which
 * point this file (and its three consumers) should migrate onto it.
 */
let systemIndicesClient: Client | undefined;

export const getSystemIndicesClient = (elasticsearchHost: string): Client => {
  if (!systemIndicesClient) {
    const url = new URL(elasticsearchHost);
    url.username = systemIndicesSuperuser.username;
    url.password = systemIndicesSuperuser.password;

    systemIndicesClient = createEsClientForTesting({
      esUrl: url.toString(),
      authOverride: systemIndicesSuperuser,
    });
  }

  return systemIndicesClient;
};

/**
 * Parses an `@kbn/es-archiver` `data.json` file. The file is a sequence of
 * pretty-printed JSON blocks separated by blank lines, each shaped like
 * `{ type, value: { id, index, source } }`. Only document entries (those carrying an
 * `id` + `index`) are returned.
 */
const parseArchiveDocs = (archivePath: string): ArchiveDoc[] => {
  const raw = readFileSync(join(REPO_ROOT, archivePath, 'data.json'), 'utf8');

  return raw
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => JSON.parse(block))
    .filter((entry) => entry?.value?.id && entry?.value?.index)
    .map((entry) => ({
      id: entry.value.id as string,
      index: entry.value.index as string,
      source: entry.value.source as Record<string, any>,
    }));
};

/**
 * Saved-object types whose documents should never be purged during a reset: `space`
 * objects are provisioned/torn down out-of-band by the individual specs (via `kbnClient`),
 * so wiping them here would delete spaces that other suites in the same worker rely on.
 */
const PRESERVED_TYPES = new Set(['space']);

/**
 * Deletes every document of the archive's object types (except {@link PRESERVED_TYPES})
 * across the `.kibana*` indices, restoring a pristine state before a load. Without it, stray
 * objects left behind by earlier suites (e.g. copied/resolved objects with generated ids
 * and `originId`s that reference the archive fixtures) leak into the reference graph and
 * corrupt `_get_shareable_references` / `_update_objects_spaces` assertions.
 */
const resetArchiveTypes = async (esClient: Client, docs: ArchiveDoc[]) => {
  const types = Array.from(
    new Set(
      docs.map((doc) => doc.source.type as string).filter((type) => !PRESERVED_TYPES.has(type))
    )
  );
  if (types.length === 0) {
    return;
  }

  await esClient.deleteByQuery({
    index: '.kibana*',
    conflicts: 'proceed',
    refresh: true,
    ignore_unavailable: true,
    query: { terms: { type: types } },
  });
};

/**
 * Restores the pristine archive state: purges any pre-existing documents of the archive's
 * object types, then indexes every archive document into its recorded index.
 */
export const loadEsArchive = async (elasticsearchHost: string, archivePath: string) => {
  const docs = parseArchiveDocs(archivePath);
  if (docs.length === 0) {
    return;
  }

  const esClient = getSystemIndicesClient(elasticsearchHost);
  await resetArchiveTypes(esClient, docs);

  const operations = docs.flatMap((doc) => [
    { index: { _index: doc.index, _id: doc.id } },
    doc.source,
  ]);

  const response = await esClient.bulk({ operations, refresh: true });
  if (response.errors) {
    const failed = response.items
      .map((item) => item.index)
      .filter((op) => op?.error)
      .map((op) => `${op?._index}/${op?._id}: ${JSON.stringify(op?.error)}`);
    throw new Error(`Failed to load ES archive '${archivePath}':\n${failed.join('\n')}`);
  }
};

/**
 * Deletes every document contained in the archive. Missing documents are ignored, but any
 * other per-document failure throws: a silently partial unload would leave stale archive
 * docs (including `space` docs, which {@link PRESERVED_TYPES} exempts from the next load's
 * purge) that make later suites' space creation 409 or corrupt counts.
 */
export const unloadEsArchive = async (elasticsearchHost: string, archivePath: string) => {
  const docs = parseArchiveDocs(archivePath);
  if (docs.length === 0) {
    return;
  }

  const operations = docs.map((doc) => ({ delete: { _index: doc.index, _id: doc.id } }));

  const response = await getSystemIndicesClient(elasticsearchHost).bulk({
    operations,
    refresh: true,
  });
  if (response.errors) {
    const failed = response.items
      .map((item) => item.delete)
      .filter((op) => op?.error && op.status !== 404)
      .map((op) => `${op?._index}/${op?._id}: ${JSON.stringify(op?.error)}`);
    if (failed.length > 0) {
      throw new Error(`Failed to unload ES archive '${archivePath}':\n${failed.join('\n')}`);
    }
  }
};
