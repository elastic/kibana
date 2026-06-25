/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import { DeepStrict } from '@kbn/zod-helpers/v4';
import type {
  ContentPack,
  ContentPackDashboard,
  ContentPackEntry,
  ContentPackManifest,
  ContentPackSavedObject,
  ContentPackStream,
  ContentPackStreamRequest,
} from '@kbn/content-packs-schema';
import {
  SUPPORTED_ENTRY_TYPE,
  SUPPORTED_SAVED_OBJECT_TYPE,
  contentPackManifestSchema,
  getEntryTypeByFile,
  isSupportedEntryType,
  isSupportedFile,
  isSupportedReferenceType,
} from '@kbn/content-packs-schema';
import { Streams } from '@kbn/streams-schema';
import AdmZip from 'adm-zip';
import path from 'path';
import type { Readable } from 'stream';
import { compact, omit, pick, uniqBy } from 'lodash';
import { InvalidContentPackError } from './error';

const ARCHIVE_ENTRY_MAX_SIZE_BYTES = 1 * 1024 * 1024; // 1MB

// Strict wired upsert schema: `DeepStrict` over the wired upsert shape (equivalent to
// `Streams.WiredStream.UpsertRequest.is`), applied so the parsed request can be `safeParse`d
// without a type assertion.
const wiredUpsertRequestSchema = DeepStrict(Streams.WiredStream.UpsertRequest.right);

/**
 * Content-pack stream entries match the wired stream upsert request. Significant-event
 * queries are not part of content packs (they are managed via the dedicated
 * `/api/streams/{name}/queries` endpoints), so this guard validates the strict wired upsert
 * shape. `extractEntries` calls `stripQueriesOrReject` first, so an absent or empty
 * `queries: []` is stripped before this guard runs and any other `queries` value is rejected
 * upfront.
 */
export function isContentPackStreamRequest(value: unknown): value is ContentPackStreamRequest {
  return wiredUpsertRequestSchema.safeParse(value).success;
}

/**
 * Significant-event queries are not part of content packs; they are managed via the dedicated
 * `/api/streams/{name}/queries` endpoints. Reject a stream entry that still carries queries so
 * detections are never silently dropped on import. Only an absent field or an empty
 * `queries: []` is allowed (and stripped); any other value is rejected regardless of its shape
 * (non-empty array, object, etc.). Returns the request with the `queries` key removed.
 */
export function stripQueriesOrReject(
  streamName: string | undefined,
  entryName: string,
  request: Record<string, unknown>
): Record<string, unknown> {
  const queries = request.queries;
  const isAbsentOrEmpty = queries === undefined || (Array.isArray(queries) && queries.length === 0);
  if (!isAbsentOrEmpty) {
    throw new InvalidContentPackError(
      `Stream [${streamName}] in entry [${entryName}] contains significant-event queries, which are not supported by content packs. Manage them via the /api/streams/{name}/queries endpoints.`
    );
  }

  return omit(request, 'queries');
}

export async function parseArchive(archive: Readable): Promise<ContentPack> {
  const zip: AdmZip = await new Promise((resolve, reject) => {
    const bufs: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => bufs.push(chunk));
    archive.on('end', () => {
      try {
        resolve(new AdmZip(Buffer.concat(bufs)));
      } catch (err) {
        reject(new InvalidContentPackError('Invalid content pack format'));
      }
    });
    archive.on('error', (error) => reject(error));
  });

  const rootDir = getRootDir(zip.getEntries());
  // @ts-expect-error upgrade typescript v5.9.3
  const manifest = await extractManifest(rootDir, zip);
  // @ts-expect-error upgrade typescript v5.9.3
  const entries = await extractEntries(rootDir, zip);

  return { ...manifest, entries };
}

export async function generateArchive(manifest: ContentPackManifest, objects: ContentPackEntry[]) {
  const zip = new AdmZip();
  const rootDir = `${manifest.name}-${manifest.version}`;

  objects
    .filter((object) => isSupportedEntryType(object.type))
    .forEach((object: ContentPackEntry) => {
      const type = object.type;
      switch (type) {
        case 'dashboard':
        case 'index-pattern':
        case 'lens': {
          const subDir = SUPPORTED_SAVED_OBJECT_TYPE[object.type];
          zip.addFile(
            path.join(rootDir, 'kibana', subDir, `${object.id}.json`),
            Buffer.from(JSON.stringify(object, null, 2))
          );
          return;
        }

        case 'stream': {
          const subDir = SUPPORTED_ENTRY_TYPE.stream;
          zip.addFile(
            path.join(rootDir, subDir, `${object.name}.json`),
            Buffer.from(JSON.stringify({ name: object.name, request: object.request }, null, 2))
          );
          return;
        }

        default:
          missingEntryTypeImpl(type);
      }
    });

  zip.addFile(
    path.join(rootDir, 'manifest.yml'),
    Buffer.from(YAML.stringify(pick(manifest, ['name', 'description', 'version'])))
  );

  return zip.toBufferPromise();
}

async function readEntry(entry: AdmZip.IZipEntry): Promise<Buffer> {
  const buf = await new Promise<Buffer>((resolve, reject) => {
    entry.getDataAsync((data, err) => {
      if (err) return reject(new Error(err));
      resolve(data);
    });
  });

  return buf;
}

async function extractManifest(rootDir: string, zip: AdmZip): Promise<ContentPackManifest> {
  const manifestPath = `${rootDir}/manifest.yml`;
  const entry = zip.getEntry(manifestPath);
  if (!entry) {
    throw new InvalidContentPackError(`Expected manifest at [${manifestPath}]`);
  }

  assertUncompressedSize(entry);

  const { data: manifest, success } = contentPackManifestSchema.safeParse(
    YAML.parse((await readEntry(entry)).toString())
  );
  if (!success) {
    throw new InvalidContentPackError('Invalid content pack manifest format');
  }

  return manifest;
}

async function extractEntries(rootDir: string, zip: AdmZip): Promise<ContentPackEntry[]> {
  const supportedEntries = zip
    .getEntries()
    .filter((entry) => isSupportedFile(rootDir, entry.entryName));

  supportedEntries.forEach((entry) => assertUncompressedSize(entry));

  const entries = await Promise.all(
    supportedEntries.map((entry) => {
      const type = getEntryTypeByFile(rootDir, entry.entryName);
      switch (type) {
        case 'lens':
        case 'index-pattern':
          // these are handled by their parent dashboard
          return [];

        case 'dashboard':
          return resolveDashboard(rootDir, zip, entry);

        case 'stream':
          return readEntry(entry).then((data) => {
            const parsed = JSON.parse(data.toString()) as {
              name?: string;
              request?: Record<string, unknown>;
            };
            const requestObject =
              parsed.request && typeof parsed.request === 'object' && !Array.isArray(parsed.request)
                ? parsed.request
                : undefined;

            const request = requestObject
              ? stripQueriesOrReject(parsed.name, entry.entryName, requestObject)
              : parsed.request;
            if (!parsed.name || !isContentPackStreamRequest(request)) {
              throw new InvalidContentPackError(
                `Invalid stream definition in entry [${entry.entryName}]`
              );
            }

            const streamEntry: ContentPackStream = {
              type: 'stream',
              name: parsed.name,
              request,
            };
            return streamEntry;
          });

        default:
          missingEntryTypeImpl(type);
      }
    })
  );

  return entries.flat();
}

async function resolveDashboard(
  rootDir: string,
  zip: AdmZip,
  dashboardEntry: AdmZip.IZipEntry
): Promise<ContentPackSavedObject[]> {
  const dashboard = JSON.parse(
    (await readEntry(dashboardEntry)).toString()
  ) as ContentPackDashboard;

  const uniqReferences = uniqBy(dashboard.references, (ref) => ref.id);
  if (uniqReferences.some(({ type }) => !isSupportedReferenceType(type))) {
    throw new InvalidContentPackError(
      `Dashboard [${
        dashboard.id
      }] references saved object types not supported by content packs: ${uniqReferences.filter(
        ({ type }) => !isSupportedReferenceType(type)
      )}`
    );
  }

  const includedReferences = compact(
    (uniqReferences as Array<{ type: ContentPackSavedObject['type']; id: string }>).map((ref) =>
      zip.getEntry(
        path.join(rootDir, 'kibana', SUPPORTED_SAVED_OBJECT_TYPE[ref.type], `${ref.id}.json`)
      )
    )
  );

  const resolvedReferences = await Promise.all(
    includedReferences.map(
      async (entry) => JSON.parse((await readEntry(entry)).toString()) as ContentPackSavedObject
    )
  );

  return [dashboard, ...resolvedReferences];
}

function getRootDir(entries: AdmZip.IZipEntry[]) {
  const rootDirs = new Set<string>();
  for (const entry of entries) {
    const rootDir = entry.entryName.split(path.sep)[0];
    rootDirs.add(rootDir);
  }

  if (rootDirs.size !== 1) {
    throw new InvalidContentPackError(
      `Expected a single root directory but got [${Array.from(rootDirs)}]`
    );
  }

  return rootDirs.keys().next().value;
}

function assertUncompressedSize(entry: AdmZip.IZipEntry) {
  if (entry.header.size > ARCHIVE_ENTRY_MAX_SIZE_BYTES) {
    throw new InvalidContentPackError(
      `Object [${entry.entryName}] exceeds the limit of ${ARCHIVE_ENTRY_MAX_SIZE_BYTES} bytes`
    );
  }
}

function missingEntryTypeImpl(type: never): never {
  throw new Error(`Content pack entry type [${type}] is not implemented`);
}
